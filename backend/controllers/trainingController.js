const TrainingRecord = require('../models/TrainingRecord');

// 1. OBTENER TODOS LOS ENTRENAMIENTOS (Necesario para los tildes en React)
exports.obtenerEntrenamientos = async (req, res) => {
    try {
        const registros = await TrainingRecord.find();
        res.status(200).json({ success: true, data: registros });
    } catch (error) {
        console.error("Error en obtenerEntrenamientos:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. CREAR O ACTUALIZAR ENTRENAMIENTO (Edición habilitada)
exports.guardarEntrenamiento = async (req, res) => {
    try {
        const { 
            vueloId, 
            vueloFecha, 
            origen, desde, 
            destino, hasta, 
            tripulanteId, 
            tripulanteNombre, 
            unidad, // Agregado para filtrar por unidad si hace falta
            procedimientos,
            cargadoPor 
        } = req.body;

        if (!vueloId || !vueloFecha || !tripulanteId || !tripulanteNombre) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan datos obligatorios (Vuelo, Fecha u Oficial).' 
            });
        }

        const payloadSanitizado = {
            vueloId,
            vueloFecha,
            origen: origen || desde || 'S/D',
            destino: destino || hasta || 'S/D',
            tripulanteId,
            tripulanteNombre,
            unidad: unidad || 'S/D',
            procedimientos: procedimientos || {},
            cargadoPor: cargadoPor || 'Sistema'
        };

        // Si existe Vuelo + Tripulante, actualiza. Si no existe, lo crea.
        const registroGuardado = await TrainingRecord.findOneAndUpdate(
            { vueloId, tripulanteId },
            payloadSanitizado,
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({ 
            success: true, 
            message: 'Entrenamiento procesado correctamente', 
            data: registroGuardado 
        });
    } catch (error) {
        console.error("Error en guardarEntrenamiento:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. ESTADÍSTICAS DASHBOARD
exports.obtenerEstadisticasDashboard = async (req, res) => {
    try {
        const registros = await TrainingRecord.find();
        const resumenTripulantes = {};

        registros.forEach(r => {
            const id = r.tripulanteId;

            if (!resumenTripulantes[id]) {
                resumenTripulantes[id] = {
                    tripulanteId: id,
                    nombre: r.tripulanteNombre,
                    totalVuelos: 0,
                    totalVisual: 0,
                    totalIFR: 0,
                    totalNocturno: 0,
                    detalle: {}
                };
            }

            resumenTripulantes[id].totalVuelos += 1;
            
            const p = r.procedimientos || {};

            const visual = (p.despegueNormal||0) + (p.despegueMinimaDistancia||0) + (p.aterrizajeNormal||0) + 
                           (p.aterrizajeMinimaDistancia||0) + (p.aterrizajeVientoCruzado||0) + (p.aterrizajeSinFlaps||0) + 
                           (p.toqueYMotor||0) + (p.circuitoTransitoVisual||0) + (p.escapeGoAround||0);
                           
            const ifr = (p.partidaEstandarizadaIFR||0) + (p.arriboEstandarizadoIFR||0) + 
                        (p.aproxNoPrecision||0) + (p.aproxPrecision||0);
                        
            const nocturno = (p.despegueNocturno||0) + (p.aterrizajeNocturno||0) + (p.circuitoTransitoNocturno||0);

            resumenTripulantes[id].totalVisual += visual;
            resumenTripulantes[id].totalIFR += ifr;
            resumenTripulantes[id].totalNocturno += nocturno;

            Object.keys(p).forEach(key => {
                const valorActual = p[key] || 0;
                resumenTripulantes[id].detalle[key] = (resumenTripulantes[id].detalle[key] || 0) + valorActual;
            });
        });

        res.json({ success: true, data: Object.values(resumenTripulantes) });
    } catch (error) {
        console.error("Error en obtenerEstadisticasDashboard:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};