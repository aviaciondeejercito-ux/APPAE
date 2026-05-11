const Vuelo = require('../models/Vuelo');
const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * REGISTRO DE VUELO E IMPACTO EN LEGAJOS (TOTALES, SdA Y TÁCTICAS)
 */
exports.registrarVuelo = async (req, res) => {
    try {
        const datosVuelo = req.body;
        const usuarioLogueado = req.user;

        // 1. Limpieza y Normalización de IDs (Evita error 400 por strings vacíos "")
        const limpiarId = (id) => (id && id.toString().trim() !== "" && id !== "undefined") ? id : null;

        // 2. Crear el registro del vuelo con IDs saneados y Matrícula estandarizada
        const nuevoVuelo = new Vuelo({
            ...datosVuelo,
            // Aeronave y Matrícula
            aeronave: datosVuelo.aeronave?.trim(),
            matricula: datosVuelo.matricula?.toUpperCase().trim(),
            
            // Tripulación saneada
            instructor: limpiarId(datosVuelo.instructor),
            piloto: limpiarId(datosVuelo.piloto),
            copiloto: limpiarId(datosVuelo.copiloto),
            mecanico: limpiarId(datosVuelo.mecanico),
            segundoMecanico: limpiarId(datosVuelo.segundoMecanico), // Soporte para dos mecánicos

            unidadResponsable: usuarioLogueado.unidad || usuarioLogueado.elemento,
            creadoPor: usuarioLogueado._id
        });

        await nuevoVuelo.save();

        // 3. Definir quiénes volaron para impactar legajos (filtramos los null)
        const tripulantesIds = [
            nuevoVuelo.instructor,
            nuevoVuelo.piloto,
            nuevoVuelo.copiloto,
            nuevoVuelo.mecanico,
            nuevoVuelo.segundoMecanico
        ].filter(id => id !== null);

        const hs = Number(datosVuelo.horasVoladas);
        const esNocturno = datosVuelo.condicion === 'Nocturno';
        const esIFR = datosVuelo.reglasVuelo === 'IFR';
        const esNVG = datosVuelo.usoNVG === true;

        // 4. Impactar cada legajo
        for (const tId of tripulantesIds) {
            const tripulante = await Tripulante.findById(tId);
            if (!tripulante) continue;

            // A. Actualizar Totales Históricos
            if (esIFR) tripulante.totalesHistoricos.vueloInstrumental += hs;
            if (esNVG) {
                tripulante.totalesHistoricos.vueloVisual += hs; 
            } else if (esNocturno) {
                tripulante.totalesHistoricos.vueloNocturno += hs;
            } else {
                tripulante.totalesHistoricos.vueloDiurno += hs;
            }

            // B. Actualizar Habilitación Específica (SdA)
            const indexHab = tripulante.habilitaciones.findIndex(h => h.aeronave === nuevoVuelo.aeronave);
            if (indexHab !== -1) {
                if (esIFR) tripulante.habilitaciones[indexHab].hsInstrumental += hs;
                if (esNVG) tripulante.habilitaciones[indexHab].hsNVG += hs;
                if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno += hs;
                if (!esNocturno && !esIFR) tripulante.habilitaciones[indexHab].hsVisual += hs;

                tripulante.habilitaciones[indexHab].totalHorasSistema += hs;
                tripulante.habilitaciones[indexHab].ultimaActividad = {
                    fecha: nuevoVuelo.fecha,
                    matricula: nuevoVuelo.matricula,
                    mision: nuevoVuelo.tipoMision
                };
            }

            // C. Impacto en Capacitaciones Tácticas
            const indexTactico = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === nuevoVuelo.tipoMision);
            if (indexTactico !== -1) {
                tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas += hs;
            }

            if (esNVG) {
                const indexNVG = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === "NVG");
                if (indexNVG !== -1) {
                    tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas += hs;
                }
            }

            await tripulante.save();
        }

        // 5. Auditoría
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'CARGA_HS',
            entidadAfectada: `Vuelo ${nuevoVuelo.aeronave} Mat: ${nuevoVuelo.matricula}`,
            detalles: `Carga automática: ${hs} hs impactadas en legajos. Tripulación: ${tripulantesIds.length}`
        });

        res.status(201).json({ mensaje: "Vuelo registrado e impacto total en legajos completado", vuelo: nuevoVuelo });

    } catch (error) {
        console.error("❌ Error en carga de vuelo:", error);
        res.status(400).json({ 
            mensaje: "Error al registrar vuelo", 
            error: error.message,
            detalles: "Verifique que todos los campos obligatorios estén completos y los tripulantes seleccionados sean válidos."
        });
    }
};

/**
 * OBTENER HISTORIAL DE VUELOS
 */
exports.obtenerVuelos = async (req, res) => {
    try {
        const { unidad } = req.query;
        let filtro = {};
        
        if (req.user.role !== 'admin') {
            filtro.unidadResponsable = req.user.unidad || req.user.elemento;
        } else if (unidad && unidad !== 'all') {
            filtro.unidadResponsable = unidad;
        }

        const vuelos = await Vuelo.find(filtro)
            .populate('instructor piloto copiloto mecanico segundoMecanico', 'grado apellido nombre')
            .sort({ fecha: -1 });

        res.json(vuelos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener historial de vuelos" });
    }
};

/**
 * ELIMINAR VUELO (Lógica Inversa: Descuenta horas de todos los sectores del legajo)
 */
exports.eliminarVuelo = async (req, res) => {
    try {
        const vuelo = await Vuelo.findById(req.params.id);
        if (!vuelo) return res.status(404).json({ mensaje: "Vuelo no encontrado" });

        const hs = Number(vuelo.horasVoladas);
        const tripulantesIds = [
            vuelo.instructor, 
            vuelo.piloto, 
            vuelo.copiloto, 
            vuelo.mecanico, 
            vuelo.segundoMecanico
        ].filter(id => id);

        const esNocturno = vuelo.condicion === 'Nocturno';
        const esIFR = vuelo.reglasVuelo === 'IFR';
        const esNVG = vuelo.usoNVG === true;

        for (const tId of tripulantesIds) {
            const tripulante = await Tripulante.findById(tId);
            if (!tripulante) continue;

            // 1. Restar de Totales Históricos
            if (esIFR) tripulante.totalesHistoricos.vueloInstrumental -= hs;
            if (esNVG) {
                tripulante.totalesHistoricos.vueloVisual -= hs;
            } else if (esNocturno) {
                tripulante.totalesHistoricos.vueloNocturno -= hs;
            } else {
                tripulante.totalesHistoricos.vueloDiurno -= hs;
            }

            // 2. Restar de SdA
            const indexHab = tripulante.habilitaciones.findIndex(h => h.aeronave === vuelo.aeronave);
            if (indexHab !== -1) {
                if (esIFR) tripulante.habilitaciones[indexHab].hsInstrumental -= hs;
                if (esNVG) tripulante.habilitaciones[indexHab].hsNVG -= hs;
                if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno -= hs;
                if (!esNocturno && !esIFR) tripulante.habilitaciones[indexHab].hsVisual -= hs;
                tripulante.habilitaciones[indexHab].totalHorasSistema -= hs;
            }

            // 3. Restar de Capacitaciones Tácticas
            const indexTactico = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === vuelo.tipoMision);
            if (indexTactico !== -1) {
                tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas -= hs;
            }
            if (esNVG) {
                const indexNVG = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === "NVG");
                if (indexNVG !== -1) tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas -= hs;
            }

            await tripulante.save();
        }

        await Vuelo.findByIdAndDelete(req.params.id);
        res.json({ mensaje: "Vuelo eliminado y horas descontadas de legajos correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar el vuelo", error: error.message });
    }
};