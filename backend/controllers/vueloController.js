const Vuelo = require('../models/Vuelo');
const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * REGISTRO DE VUELO E IMPACTO EN LEGAJOS (TOTALES, SdA POR ROL Y TÁCTICAS)
 */
exports.registrarVuelo = async (req, res) => {
    try {
        const datosVuelo = req.body;
        const usuarioLogueado = req.user;

        // 1. Limpieza y Normalización de IDs (Evita error 400 por strings vacíos "")
        const limpiarId = (id) => (id && id.toString().trim() !== "" && id !== "undefined") ? id : null;

        // 2. Crear el registro del vuelo con IDs saneados y campos adicionales
        const nuevoVuelo = new Vuelo({
            ...datosVuelo,
            aeronave: datosVuelo.aeronave?.trim(),
            matricula: datosVuelo.matricula?.toUpperCase().trim(),
            elementoApoyado: datosVuelo.elementoApoyado?.toUpperCase().trim(),
            
            // Tripulación saneada
            instructor: limpiarId(datosVuelo.instructor),
            piloto: limpiarId(datosVuelo.piloto),
            copiloto: limpiarId(datosVuelo.copiloto),
            mecanico: limpiarId(datosVuelo.mecanico),
            segundoMecanico: limpiarId(datosVuelo.segundoMecanico),

            unidadResponsable: usuarioLogueado.unidad || usuarioLogueado.elemento,
            creadoPor: usuarioLogueado._id
        });

        await nuevoVuelo.save();

        // 3. FILTRO DE PARTICIPANTES ÚNICOS (Evita duplicidad si el Instructor es también el Piloto)
        const mapaTripulantes = new Map();

        // Prioridad jerárquica de asignación de rol en caso de duplicidad de ID
        if (nuevoVuelo.segundoMecanico) mapaTripulantes.set(nuevoVuelo.segundoMecanico.toString(), 'Mecánico');
        if (nuevoVuelo.mecanico)        mapaTripulantes.set(nuevoVuelo.mecanico.toString(), 'Mecánico');
        if (nuevoVuelo.copiloto)        mapaTripulantes.set(nuevoVuelo.copiloto.toString(), 'Copiloto');
        if (nuevoVuelo.piloto)          mapaTripulantes.set(nuevoVuelo.piloto.toString(), 'Piloto');
        if (nuevoVuelo.instructor)      mapaTripulantes.set(nuevoVuelo.instructor.toString(), 'Instructor'); // Instructor pisa a piloto si es el mismo ID

        const hs = Number(datosVuelo.horasVoladas);
        const esNocturno = datosVuelo.condicion === 'Nocturno';
        const esIFR = datosVuelo.reglasVuelo === 'IFR';
        const esNVG = datosVuelo.usoNVG === true;

        // 4. Impactar cada legajo de manera cruzada SIN DUPLICADOS
        for (const [idTripulante, rolVuelo] of mapaTripulantes.entries()) {
            const tripulante = await Tripulante.findById(idTripulante);
            if (!tripulante) continue;

            // A. Totales Históricos Generales
            if (esIFR) tripulante.totalesHistoricos.vueloInstrumental += hs;
            if (esNVG) {
                tripulante.totalesHistoricos.vueloVisual += hs; 
            } else if (esNocturno) {
                tripulante.totalesHistoricos.vueloNocturno += hs;
            } else {
                tripulante.totalesHistoricos.vueloDiurno += hs;
            }

            // B. Habilitación Específica por SdA (Filtro Cruzado por Aeronave Y ROL)
            let indexHab = tripulante.habilitaciones.findIndex(h => 
                h.aeronave === nuevoVuelo.aeronave && h.rolActual === rolVuelo
            );

            // Si no tiene la habilitación con ese rol inicializada, la creamos dinámicamente para no perder el vuelo
            if (indexHab === -1) {
                tripulante.habilitaciones.push({
                    aeronave: nuevoVuelo.aeronave,
                    rolActual: rolVuelo,
                    fechaHabilitacion: nuevoVuelo.fecha,
                    hsVisual: 0,
                    hsInstrumental: 0,
                    hsNocturno: 0,
                    hsNVG: 0,
                    totalHorasSistema: 0
                });
                indexHab = tripulante.habilitaciones.length - 1;
            }

            // Distribución de horas según la condición del vuelo cargado
            if (esIFR) tripulante.habilitaciones[indexHab].hsInstrumental += hs;
            if (esNVG) tripulante.habilitaciones[indexHab].hsNVG += hs;
            if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno += hs;
            if (!esNocturno && !esIFR) tripulante.habilitaciones[indexHab].hsVisual += hs;

            tripulante.habilitaciones[indexHab].totalHorasSistema += hs;
            
            // Saneamiento de fecha para última actividad
            const fechaLimpia = nuevoVuelo.fecha instanceof Date 
                ? nuevoVuelo.fecha.toISOString().split('T')[0] 
                : nuevoVuelo.fecha;

            tripulante.habilitaciones[indexHab].ultimaActividad = {
                fecha: fechaLimpia,
                matricula: nuevoVuelo.matricula,
                mision: nuevoVuelo.tipoMision
            };

            // C. Impacto en Capacitaciones Tácticas Especiales
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

        // 5. Auditoría Reforzada
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'CARGA_HS',
            entidadAfectada: `Vuelo ${nuevoVuelo.aeronave} Mat: ${nuevoVuelo.matricula}`,
            details: `Apoyo: ${nuevoVuelo.elementoApoyado} | Pax: ${nuevoVuelo.cantidadPasajeros} | Carga: ${nuevoVuelo.pesoCarga}kg | Modo: ${nuevoVuelo.localTravesia} | Reglas: ${nuevoVuelo.reglasVuelo}`
        });

        res.status(201).json({ mensaje: "Vuelo registrado e impacto total procesado", vuelo: nuevoVuelo });

    } catch (error) {
        console.error("❌ Error en carga de vuelo:", error);
        res.status(400).json({ mensaje: "Error al registrar vuelo", detalles: error.message });
    }
};

/**
 * OBTENER HISTORIAL DE VUELOS
 */
exports.obtenerVuelos = async (req, res) => {
    try {
        const { unit } = req.query; // Sincro para query params
        const unidad = unit || req.query.unidad;
        let filtro = {};
        const rolUsuario = req.user.role ? req.user.role.toLowerCase() : 'user';
        
        if (rolUsuario !== 'admin') {
            filtro.unidadResponsable = req.user.unidad || req.user.elemento;
        } 
        else if (unidad && unidad !== 'all') {
            filtro.unidadResponsable = unidad;
        }
        
        const vuelos = await Vuelo.find(filtro)
            .populate('instructor piloto copiloto mecanico segundoMecanico', 'grado apellido nombre')
            .sort({ fecha: -1 });

        res.json(vuelos);
    } catch (error) {
        console.error("❌ Error al obtener vuelos:", error);
        res.status(500).json({ mensaje: "Error al obtener historial de vuelos" });
    }
};

/**
 * ELIMINAR VUELO (Lógica Inversa Completa Cruzada Corregida)
 */
exports.eliminarVuelo = async (req, res) => {
    try {
        const vuelo = await Vuelo.findById(req.params.id);
        if (!vuelo) return res.status(404).json({ mensaje: "Vuelo no encontrado" });

        const hs = Number(vuelo.horasVoladas);
        
        // FILTRO DE PARTICIPANTES ÚNICOS PARA RESTAR EXACTAMENTE LO QUE SE SUMÓ
        const mapaTripulantes = new Map();
        if (vuelo.segundoMecanico) mapaTripulantes.set(vuelo.segundoMecanico.toString(), 'Mecánico');
        if (vuelo.mecanico)        mapaTripulantes.set(vuelo.mecanico.toString(), 'Mecánico');
        if (vuelo.copiloto)        mapaTripulantes.set(vuelo.copiloto.toString(), 'Copiloto');
        if (vuelo.piloto)          mapaTripulantes.set(vuelo.piloto.toString(), 'Piloto');
        if (vuelo.instructor)      mapaTripulantes.set(vuelo.instructor.toString(), 'Instructor');

        const esNocturno = vuelo.condicion === 'Nocturno';
        const esIFR = vuelo.reglasVuelo === 'IFR';
        const esNVG = vuelo.usoNVG === true;

        for (const [idTripulante, rolVuelo] of mapaTripulantes.entries()) {
            const tripulante = await Tripulante.findById(idTripulante);
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

            // 2. Restar de SdA (Filtro Cruzado Exacto por Aeronave Y ROL)
            const indexHab = tripulante.habilitaciones.findIndex(h => 
                h.aeronave === vuelo.aeronave && h.rolActual === rolVuelo
            );
            
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
        res.json({ mensaje: "Vuelo eliminado y horas descontadas correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar el vuelo", error: error.message });
    }
};