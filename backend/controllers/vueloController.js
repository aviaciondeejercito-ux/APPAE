const Vuelo = require('../models/Vuelo');
const Tripulante = require('../models/Tripulante');
const Auditoria = require('../models/Auditoria');

/**
 * REGISTRO DE VUELO E IMPACTO EN LEGAJOS
 * OPTIMIZADO PARA ESTÁNDAR v3.6 (Delegación en Pre-Save)
 */
exports.registrarVuelo = async (req, res) => {
    try {
        const datosVuelo = req.body;
        const usuarioLogueado = req.user;

        // 1. Limpieza y Normalización de IDs
        const limpiarId = (id) => (id && id.toString().trim() !== "" && id !== "undefined") ? id : null;

        // 2. Crear el registro del vuelo con IDs saneados
        const nuevoVuelo = new Vuelo({
            ...datosVuelo,
            aeronave: datosVuelo.aeronave?.trim(),
            matricula: datosVuelo.matricula?.toUpperCase().trim(),
            elementoApoyado: datosVuelo.elementoApoyado?.toUpperCase().trim(),
            
            instructor: limpiarId(datosVuelo.instructor),
            piloto: limpiarId(datosVuelo.piloto),
            copiloto: limpiarId(datosVuelo.copiloto),
            mecanico: limpiarId(datosVuelo.mecanico),
            segundoMecanico: limpiarId(datosVuelo.segundoMecanico),

            unidadResponsable: usuarioLogueado.unidad || usuarioLogueado.elemento,
            creadoPor: usuarioLogueado._id
        });

        // El .save() dispara automáticamente el hook 'pre-save' que procesa de forma limpia y consolidada las horas generales y de SdA
        await nuevoVuelo.save();

        // 3. PROCESAMIENTO EXCLUSIVO DE CAPACITACIONES TÁCTICAS (El controlador solo maneja esto)
        const mapaTripulantes = new Map();
        if (nuevoVuelo.segundoMecanico) mapaTripulantes.set(nuevoVuelo.segundoMecanico.toString(), 'Mecánico');
        if (nuevoVuelo.mecanico)        mapaTripulantes.set(nuevoVuelo.mecanico.toString(), 'Mecánico');
        if (nuevoVuelo.copiloto)        mapaTripulantes.set(nuevoVuelo.copiloto.toString(), 'Copiloto');
        if (nuevoVuelo.piloto)          mapaTripulantes.set(nuevoVuelo.piloto.toString(), 'Piloto');
        if (nuevoVuelo.instructor)      mapaTripulantes.set(nuevoVuelo.instructor.toString(), 'Instructor');

        const hs = Number(datosVuelo.horasVoladas || 0);
        const esNVG = datosVuelo.usoNVG === true;

        for (const idTripulante of mapaTripulantes.keys()) {
            const tripulante = await Tripulante.findById(idTripulante);
            if (!tripulante) continue;

            let flagModificado = false;

            // Acreditación de horas en la misión específica
            const indexTactico = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === nuevoVuelo.tipoMision);
            if (indexTactico !== -1) {
                tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas += hs;
                flagModificado = true;
            }

            // Acreditación adicional por uso de NVG
            if (esNVG) {
                const indexNVG = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === "NVG");
                if (indexNVG !== -1) {
                    tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas += hs;
                    flagModificado = true;
                }
            }

            if (flagModificado) {
                await tripulante.save();
            }
        }

        // 4. Auditoría Reforzada
        await Auditoria.create({
            usuarioId: usuarioLogueado._id,
            usuarioNombre: `${usuarioLogueado.grado} ${usuarioLogueado.apellido}`,
            usuarioUnidad: usuarioLogueado.unidad || usuarioLogueado.elemento || "S/U",
            accion: 'CARGA_HS',
            entidadAfectada: `Vuelo ${nuevoVuelo.aeronave} Mat: ${nuevoVuelo.matricula}`,
            details: `Apoyo: ${nuevoVuelo.elementoApoyado} | Pax: ${nuevoVuelo.cantidadPasajeros} | Carga: ${nuevoVuelo.pesoCarga}kg | Modo: ${nuevoVuelo.localTravesia} | Reglas: ${nuevoVuelo.reglasVuelo}`
        });

        res.status(201).json({ mensaje: "Vuelo registrado e impacto total procesado con éxito", vuelo: nuevoVuelo });

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
        const { unit } = req.query;
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
 * ELIMINAR VUELO (Lógica Inversa Sincronizada con el Recálculo)
 */
exports.eliminarVuelo = async (req, res) => {
    try {
        const vuelo = await Vuelo.findById(req.params.id);
        if (!vuelo) return res.status(404).json({ mensaje: "Vuelo no encontrado" });

        const hs = Number(vuelo.horasVoladas || 0);
        const esNocturno = vuelo.condicion === 'Nocturno';
        const esIFR = vuelo.reglasVuelo === 'IFR';
        const esNVG = vuelo.usoNVG === true;
        const esVisual = !esNocturno && !esIFR && !esNVG;

        const mapaTripulantes = new Map();
        if (vuelo.segundoMecanico) mapaTripulantes.set(vuelo.segundoMecanico.toString(), 'Mecánico');
        if (vuelo.mecanico)        mapaTripulantes.set(vuelo.mecanico.toString(), 'Mecánico');
        if (vuelo.copiloto)        mapaTripulantes.set(vuelo.copiloto.toString(), 'Copiloto');
        if (vuelo.piloto)          mapaTripulantes.set(vuelo.piloto.toString(), 'Piloto');
        if (vuelo.instructor)      mapaTripulantes.set(vuelo.instructor.toString(), 'Instructor');

        for (const [idTripulante, rolVuelo] of mapaTripulantes.entries()) {
            const tripulante = await Tripulante.findById(idTripulante);
            if (!tripulante) continue;

            // 1. Restar de Habilitaciones por SdA y Rol (Lógica espejo)
            const indexHab = tripulante.habilitaciones.findIndex(h => 
                h.aeronave === vuelo.aeronave && h.rolActual === rolVuelo
            );
            
            if (indexHab !== -1) {
                if (esVisual) tripulante.habilitaciones[indexHab].hsVisual = Math.max(0, tripulante.habilitaciones[indexHab].hsVisual - hs);
                if (esIFR) tripulante.habilitaciones[indexHab].hsInstrumental = Math.max(0, tripulante.habilitaciones[indexHab].hsInstrumental - hs);
                if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno = Math.max(0, tripulante.habilitaciones[indexHab].hsNocturno - hs);
                if (esNVG) tripulante.habilitaciones[indexHab].hsNVG = Math.max(0, tripulante.habilitaciones[indexHab].hsNVG - hs);
                
                // Recalculamos el total del SdA para ese rol específico
                tripulante.habilitaciones[indexHab].totalHorasSistema = 
                    Number(tripulante.habilitaciones[indexHab].hsVisual || 0) +
                    Number(tripulante.habilitaciones[indexHab].hsInstrumental || 0) +
                    Number(tripulante.habilitaciones[indexHab].hsNocturno || 0) +
                    Number(tripulante.habilitaciones[indexHab].hsNVG || 0);
            }

            // 2. RECALCULO DE TOTALES HISTÓRICOS GENERALES (Aplicando el algoritmo de máximos por SdA para mantener consistencia)
            const mapaSdA = {};
            tripulante.habilitaciones.forEach(hab => {
                const sdaId = hab.aeronave;
                if (!mapaSdA[sdaId]) mapaSdA[sdaId] = { v: 0, i: 0, n: 0, nvg: 0 };
                mapaSdA[sdaId].v = Math.max(mapaSdA[sdaId].v, Number(hab.hsVisual || 0));
                mapaSdA[sdaId].i = Math.max(mapaSdA[sdaId].i, Number(hab.hsInstrumental || 0));
                mapaSdA[sdaId].n = Math.max(mapaSdA[sdaId].n, Number(hab.hsNocturno || 0));
                mapaSdA[sdaId].nvg = Math.max(mapaSdA[sdaId].nvg, Number(hab.hsNVG || 0));
            });

            const totalesLimpios = { v: 0, i: 0, n: 0, nvg: 0 };
            Object.values(mapaSdA).forEach(sistema => {
                totalesLimpios.v += sistema.v;
                totalesLimpios.i += sistema.i;
                totalesLimpios.n += sistema.n;
                totalesLimpios.nvg += sistema.nvg;
            });

            tripulante.totalesHistoricos.vueloDiurno = totalesLimpios.v;
            tripulante.totalesHistoricos.vueloInstrumental = totalesLimpios.i;
            tripulante.totalesHistoricos.vueloNocturno = totalesLimpios.n;
            tripulante.totalesHistoricos.vueloVisual = totalesLimpios.nvg;

            // 3. Restar de Capacitaciones Tácticas
            const indexTactico = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === vuelo.tipoMision);
            if (indexTactico !== -1) {
                tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas = Math.max(0, tripulante.capacitacionesEspeciales[indexTactico].horasAcreditadas - hs);
            }
            if (esNVG) {
                const indexNVG = tripulante.capacitacionesEspeciales.findIndex(c => c.tipo === "NVG");
                if (indexNVG !== -1) {
                    tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas = Math.max(0, tripulante.capacitacionesEspeciales[indexNVG].horasAcreditadas - hs);
                }
            }

            await tripulante.save();
        }

        // Finalmente eliminamos físicamente el documento de vuelo
        await Vuelo.findByIdAndDelete(req.params.id);
        res.json({ mensaje: "Vuelo eliminado y horas descontadas correctamente bajo estándar v3.6" });
    } catch (error) {
        console.error("❌ Error al eliminar vuelo:", error);
        res.status(500).json({ mensaje: "Error al eliminar el vuelo", error: error.message });
    }
};