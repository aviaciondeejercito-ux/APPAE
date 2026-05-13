const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

/**
 * Obtiene la planificación completa cruzando Oficiales con sus Planes.
 * ACTUALIZADO: Soporte para campo 'elemento' y normalización de roles.
 */
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role, rol } = req.query;
        const currentAnio = Number(anio) || 2026;

        // 1. Normalización de Rol (Sincro Joker)
        const rawRole = role || rol || '';
        const roleBase = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        // 2. Filtro de Oficiales (Grados de conducción y ejecución)
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        
        // Iniciamos el filtro base
        let queryOficiales = { 
            grado: { $in: gradosOficiales }, 
            activo: { $ne: false } 
        };

        // 3. Filtro de unidad (Seguridad AE) con soporte para 'elemento'
        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS', 'OTO'].includes(roleBase);
        
        if (!esSuperUser && unidad) {
            const unidadLimpia = unidad.trim().toUpperCase();
            // Buscamos en ambos campos para asegurar que aparezcan
            queryOficiales.$or = [
                { unidad: unidadLimpia },
                { elemento: unidadLimpia }
            ];
        }

        // 4. Búsqueda paralela
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            ExigenciaPlan.find({ 
                año: currentAnio 
            }).lean()
        ]);

        // 5. Merge de datos: Oficial + Plan (si existe)
        const respuesta = oficiales.map(oficial => {
            // Buscamos el plan en la colección ExigenciaPlan
            const planExistente = planes.find(p => p.piloto?.toString() === oficial._id?.toString());
            
            // Si no existe, devolvemos el piloto con una estructura de plan vacía para el Frontend
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.elemento || oficial.unidad,
                habilitaciones: oficial.habilitaciones || [], 
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

        res.json(respuesta);
    } catch (error) {
        console.error("❌ ERROR EBM_CONTROLLER (GET):", error);
        res.status(500).json({ message: "Error al unificar planificación EBM", detalle: error.message });
    }
};

/**
 * Guarda o actualiza el plan individual de un oficial.
 */
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        if (!pilotoId || !año) {
            return res.status(400).json({ message: "Faltan datos críticos (ID o Año)" });
        }

        // Usamos la unidad normalizada
        const unidadLimpia = unidad ? unidad.toUpperCase().trim() : "";

        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { 
                trimestres, 
                unidad: unidadLimpia, 
                piloto: pilotoId,
                año: año 
            },
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