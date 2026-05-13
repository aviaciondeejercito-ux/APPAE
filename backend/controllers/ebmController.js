const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

/**
 * Obtiene la planificación completa cruzando Oficiales con sus Planes.
 * Coincide con: GET /api/ebm/planificacion-completa
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role } = req.query;
        const currentAnio = anio || 2026;

        // 1. Filtro de Oficiales (Grados de conducción y ejecución)
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let queryOficiales = { grado: { $in: gradosOficiales }, activo: true };

        // 2. Filtro de unidad según rol (Seguridad AE)
        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS'].includes(role?.toUpperCase());
        if (!esSuperUser && unidad) {
            queryOficiales.unidad = unidad;
        }

        // 3. Búsqueda paralela para optimizar tiempos de respuesta
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }),
            ExigenciaPlan.find({ 
                año: currentAnio, 
                unidad: esSuperUser ? { $exists: true } : unidad 
            })
        ]);

        // 4. Merge de datos: Oficial + Plan (si existe)
        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto.toString() === oficial._id.toString());
            
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.unidad,
                habilitaciones: oficial.habilitaciones || [], // Necesario para filtrar por SdA en el frontend
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
        console.error("❌ ERROR EBM_CONTROLLER (GET):", error);
        res.status(500).json({ message: "Error al unificar planificación EBM" });
    }
};

/**
 * Guarda o actualiza el plan individual de un oficial.
 * Coincide con: POST /api/ebm/save
 */
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        if (!pilotoId || !año) {
            return res.status(400).json({ message: "Faltan datos críticos (ID o Año)" });
        }

        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { trimestres, unidad, piloto: pilotoId },
            { upsert: true, new: true }
        );

        res.json({ 
            success: true,
            message: "Plan operativo actualizado correctamente", 
            plan 
        });
    } catch (error) {
        console.error("❌ ERROR EBM_CONTROLLER (POST):", error);
        res.status(500).json({ message: "Error al guardar el plan individual" });
    }
};