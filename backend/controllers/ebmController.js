const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

// Obtener la planificación completa cruzando Oficiales con sus Planes y Habilitaciones
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role } = req.query;
        const currentAnio = anio || 2026;

        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryOficiales = { grado: { $in: gradosOficiales } };

        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS'].includes(role?.toUpperCase());
        if (!esSuperUser && unidad) {
            queryOficiales.unidad = unidad;
        }

        // Buscamos oficiales y planes en paralelo
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }),
            ExigenciaPlan.find({ año: currentAnio, unidad: esSuperUser ? { $exists: true } : unidad })
        ]);

        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto.toString() === oficial._id.toString());
            
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.unidad,
                // Incluimos las habilitaciones para que el frontend filtre por SdA
                habilitaciones: oficial.habilitaciones || [],
                plan: planExistente || {
                    año: currentAnio,
                    unidad: oficial.unidad,
                    trimestres: [
                        { numero: 1, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 2, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 3, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 4, rol: '', tipo: '', causaNoCumplimiento: '' }
                    ]
                }
            };
        });

        res.json(respuesta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al unificar planificación EBM" });
    }
};

exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { trimestres, unidad, piloto: pilotoId },
            { upsert: true, new: true }
        );

        res.json({ message: "Plan actualizado correctamente", plan });
    } catch (error) {
        res.status(500).json({ message: "Error al guardar el plan individual" });
    }
};