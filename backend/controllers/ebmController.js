const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

/**
 * CONTROLADOR EBM - EXIGENCIAS BÁSICAS MÍNIMAS
 * Sincroniza legajos de Tripulantes con Planes Trimestrales del año en curso.
 * ESTÁNDAR: SINCRO JOKER v3.5
 */

// 1. Obtener planificación completa
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role, rol } = req.query;
        const currentAnio = Number(anio) || new Date().getFullYear();

        // Normalización de Rol para seguridad (Soporte para ambas variantes de campo)
        const rawRole = role || rol || '';
        const roleBase = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        // Grados autorizados para figurar en la planificación EBM (Cuadros de mando y ejecución)
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        
        let queryOficiales = { 
            grado: { $in: gradosOficiales }, 
            activo: { $ne: false } 
        };

        // Filtro de unidad: Soporta tanto el campo 'unidad' como 'elemento' detectado en MongoDB
        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS', 'OTO'].includes(roleBase);
        
        if (!esSuperUser && unidad) {
            const unidadLimpia = unidad.trim().toUpperCase();
            // Búsqueda Joker: mira en ambos campos para que el piloto no desaparezca por diferencias de nombre de campo
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

        // Búsqueda de datos en paralelo para optimizar la carga del panel
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            ExigenciaPlan.find({ año: currentAnio }).lean()
        ]);

        // Merge de datos: Unimos al Oficial con su Plan (si existe) o inyectamos uno vacío
        const respuesta = oficiales.map(oficial => {
            // Buscamos si el piloto ya tiene un plan guardado en la colección ExigenciaPlan
            const planExistente = planes.find(p => p.piloto?.toString() === oficial._id?.toString());
            
            return {
                _id: oficial._id,
                grado: oficial.grado,
                apellido: oficial.apellido,
                nombre: oficial.nombre,
                unidad: oficial.elemento || oficial.unidad,
                habilitaciones: oficial.habilitaciones || [], 
                // LÓGICA DE INYECCIÓN SEGURA: Si no hay plan en la DB, generamos uno en memoria
                // Esto permite que el piloto aparezca en la tabla de EBM aunque sea nuevo
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

        // Enviamos la lista completa de oficiales procesados con status 200
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
 * Si el plan no existe (porque era inyectado), se crea mediante Upsert.
 */
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        if (!pilotoId || !año) {
            return res.status(400).json({ mensaje: "Faltan datos críticos (ID o Año)" });
        }

        // Normalización de la unidad/elemento para el guardado consistente
        const unidadLimpia = unidad ? unidad.toUpperCase().trim() : "";

        // Buscamos por piloto y año. Si existe actualiza, si no lo crea (upsert: true)
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