const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, rol } = req.query;
        const currentAnio = Number(anio) || 2026;

        // 1. Ampliamos los grados para incluir Suboficiales y todos los niveles de Oficiales
        // Incluimos "TP" (Teniente Primero) que es el grado de Galmarini en tu foto.
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST', 'SP', 'SA', 'SI', 'SAY', 'Sarg', 'Cabo'];
        
        let queryOficiales = { 
            grado: { $in: gradosHabilitados }, 
            activo: true 
        };

        // 2. Filtro de unidad (Sincro Joker)
        if (unidad && unidad !== 'all') {
            const unidadLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [
                { unidad: unidadLimpia },
                { elemento: unidadLimpia }
            ];
        }

        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            ExigenciaPlan.find({ año: currentAnio }).lean()
        ]);

        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto?.toString() === oficial._id.toString());
            
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.elemento || oficial.unidad,
                habilitaciones: oficial.habilitaciones || [],
                // Si no hay plan, inyectamos la estructura para Galmarini y el resto
                plan: planExistente || {
                    año: currentAnio,
                    unidad: oficial.elemento || oficial.unidad,
                    trimestres: [
                        { numero: 1, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 2, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 3, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 4, rol: '', tipo: '', causaNoCumplimiento: '' }
                    ]
                }
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        res.status(500).json({ mensaje: "Error en servidor", error: error.message });
    }
};

exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;
        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { piloto: pilotoId, año, trimestres, unidad: unidad?.toUpperCase().trim() },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al guardar" });
    }
};