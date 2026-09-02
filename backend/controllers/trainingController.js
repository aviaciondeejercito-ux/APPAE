const TrainingRecord = require('../models/TrainingRecord');

// Cargar o actualizar entrenamiento
exports.guardarEntrenamiento = async (req, res) => {
    try {
        const nuevoRegistro = new TrainingRecord(req.body);
        await nuevoRegistro.save();
        res.status(201).json({ success: true, message: 'Entrenamiento registrado con éxito', data: nuevoRegistro });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Resumen acumulado para el Dashboard
exports.obtenerEstadisticasDashboard = async (req, res) => {
    try {
        const registros = await TrainingRecord.find();
        
        // Agrupación por tripulante
        const resumenTripulantes = {};

        registros.forEach(r => {
            const id = r.tripulanteId;
            if (!resumenTripulantes[id]) {
                resumenTripulantes[id] = {
                    nombre: r.tripulanteNombre,
                    totalVuelos: 0,
                    totalVisual: 0,
                    totalIFR: 0,
                    totalNocturno: 0,
                    detalle: { ...r.procedimientos }
                };
            }

            resumenTripulantes[id].totalVuelos += 1;
            
            const p = r.procedimientos;
            const visual = (p.despegueNormal||0) + (p.despegueMinimaDistancia||0) + (p.aterrizajeNormal||0) + 
                           (p.aterrizajeMinimaDistancia||0) + (p.aterrizajeVientoCruzado||0) + (p.aterrizajeSinFlaps||0) + 
                           (p.toqueYMotor||0) + (p.circuitoTransitoVisual||0) + (p.escapeGoAround||0);
                           
            const ifr = (p.partidaEstandarizadaIFR||0) + (p.arriboEstandarizadoIFR||0) + 
                        (p.aproxNoPrecision||0) + (p.aproxPrecision||0);
                        
            const nocturno = (p.despegueNocturno||0) + (p.aterrizajeNocturno||0) + (p.circuitoTransitoNocturno||0);

            resumenTripulantes[id].totalVisual += visual;
            resumenTripulantes[id].totalIFR += ifr;
            resumenTripulantes[id].totalNocturno += nocturno;
        });

        res.json({ success: true, data: Object.values(resumenTripulantes) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};