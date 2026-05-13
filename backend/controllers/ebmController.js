const Tripulante = require('../models/Tripulante');
const Vuelo = require('../models/Vuelo');
const ExigenciaPlan = require('../models/ExigenciaPlan');

/**
 * Obtiene la planificación completa cruzando pilotos con sus horas reales de vuelo.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio } = req.query;
        const currentAnio = Number(anio) || 2026;

        // Filtro de Oficiales (CR hasta ST)
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryOficiales = { 
            grado: { $in: gradosOficiales }, 
            activo: { $ne: false } 
        };

        // Sincro Joker: unidad o elemento
        if (unidad && unidad !== 'all') {
            const uLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [{ unidad: uLimpia }, { elemento: uLimpia }];
        }

        const [oficiales, vuelosAnio] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            Vuelo.find({
                fecha: {
                    $gte: new Date(`${currentAnio}-01-01`),
                    $lte: new Date(`${currentAnio}-12-31T23:59:59Z`)
                }
            }).lean()
        ]);

        const respuesta = oficiales.map(piloto => {
            const horasTrimestrales = [0, 0, 0, 0];

            vuelosAnio.forEach(v => {
                // Buscamos al piloto en cualquier rol del vuelo
                const esParte = [v.piloto, v.copiloto, v.instructor, v.mecanico]
                    .some(id => id?.toString() === piloto._id.toString());

                if (esParte) {
                    const mes = new Date(v.fecha).getMonth(); // 0-11
                    const trimestre = Math.floor(mes / 3); // 0-3
                    horasTrimestrales[trimestre] += (Number(v.horasVoladas) || 0);
                }
            });

            return {
                _id: piloto._id,
                grado: piloto.grado,
                apellido: piloto.apellido,
                nombre: piloto.nombre,
                unidad: piloto.elemento || piloto.unidad,
                habilitaciones: piloto.habilitaciones || [],
                horasReales: horasTrimestrales // Array [T1, T2, T3, T4]
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        console.error("❌ ERROR EBM_CONTROLLER:", error.message);
        res.status(500).json({ mensaje: "Error al procesar datos de pilotos" });
    }
};

/**
 * Guarda o actualiza el plan individual (el que se envía por POST /save)
 */
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;
        
        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { 
                piloto: pilotoId, 
                año: Number(año), 
                trimestres, 
                unidad: unidad?.toUpperCase().trim() 
            },
            { upsert: true, new: true }
        );
        
        res.status(200).json({ success: true, plan });
    } catch (error) {
        console.error("❌ ERROR AL GUARDAR:", error.message);
        res.status(500).json({ mensaje: "Error al guardar planificación" });
    }
};