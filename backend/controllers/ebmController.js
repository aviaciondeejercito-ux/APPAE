const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

/**
 * CONTROLADOR EBM - EXIGENCIAS BÁSICAS MÍNIMAS
 * Sincroniza legajos de Tripulantes con Planes Trimestrales.
 */

// 1. Obtener planificación completa
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role, rol } = req.query;
        const currentAnio = Number(anio) || new Date().getFullYear();

        // Normalización de Rol para seguridad
        const rawRole = role || rol || '';
        const roleBase = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        // Grados autorizados para figurar en la planificación EBM
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        
        let queryOficiales = { 
            grado: { $in: gradosOficiales }, 
            activo: { $ne: false } 
        };

        // Filtro de unidad: Soporta tanto el campo 'unidad' como 'elemento'
        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS', 'OTO'].includes(roleBase);
        
        if (!esSuperUser && unidad) {
            const unidadLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [
                { unidad: unidadLimpia },
                { elemento: unidadLimpia }
            ];
        } else if (esSuperUser && unidad && unidad !== 'all') {
            const unidadLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [
                { unidad: unidadLimpia },
                { elemento: unidadLimpia }
            ];
        }

        // Búsqueda de datos
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            ExigenciaPlan.find({ año: currentAnio }).lean()
        ]);

        // Merge de datos: Unimos al Oficial con su Plan (si existe) o inyectamos uno vacío
        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto?.toString() === oficial._id?.toString());
            
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.elemento || oficial.unidad,
                habilitaciones: oficial.habilitaciones || [], 
                // Lógica de Inyección Segura: Si no hay plan, se crea una estructura de 4 trimestres
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
        console.error("❌ ERROR EBM_CONTROLLER (GET):", error);
        res.status(500).json({ 
            mensaje: "Error al unificar planificación EBM", 
            detalle: error.message 
        });
    }
};

/**
 * Guarda o actualiza el plan individual de un oficial.
 */
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        if (!pilotoId || !año) {
            return res.status(400).json({ mensaje: "Faltan datos críticos (ID o Año)" });
        }

        // Normalización de la unidad para el guardado
        const unidadLimpia = unidad ? unidad.toUpperCase().trim() : "";

        const planActualizado = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { 
                trimestres, 
                unidad: unidadLimpia, 
                piloto: pilotoId,
                año: año 
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({ 
            success: true,
            message: "Plan operativo actualizado correctamente", 
            plan: planActualizado 
        });
    } catch (error) {
        console.error("❌ ERROR EBM_CONTROLLER (POST):", error);
        res.status(500).json({ mensaje: "Error al guardar el plan individual" });
    }
};