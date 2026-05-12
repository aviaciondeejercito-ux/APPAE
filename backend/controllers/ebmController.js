const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

// Obtener la planilla completa cruzando Oficiales con sus Planes
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role } = req.query;
        const currentAnio = anio || 2026;

        // 1. Definir filtro de Oficiales (CR a ST)
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryOficiales = { grado: { $in: gradosOficiales } };

        // 2. Filtro de unidad segun rol
        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS'].includes(role?.toUpperCase());
        if (!esSuperUser && unidad) {
            queryOficiales.unidad = unidad;
        }

        // 3. Ejecutar búsquedas en paralelo para velocidad
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }),
            ExigenciaPlan.find({ año: currentAnio, unidad: esSuperUser ? { $exists: true } : unidad })
        ]);

        // 4. Cruzar los datos (Merge)
        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto.toString() === oficial._id.toString());
            
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.unidad,
                // Si existe el plan lo mandamos, si no mandamos la estructura base
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

// Guardar o actualizar plan individual (Se mantiene igual, está perfecto)
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