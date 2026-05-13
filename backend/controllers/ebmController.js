const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

/**
 * CONTROLADOR EBM - EXIGENCIAS BÁSICAS MÍNIMAS
 * Sincroniza legajos de Tripulantes con Planes Trimestrales.
 * ESTÁNDAR: SINCRO JOKER v3.5
 */

// 1. Obtener planificación completa
exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad, anio, role, rol } = req.query;
        const currentAnio = Number(anio) || new Date().getFullYear();

        // Normalización Joker: Detecta el rol sin importar el nombre del campo
        const rawRole = role || rol || '';
        const roleBase = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        // Grados habilitados para EBM
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        
        let queryOficiales = { 
            grado: { $in: gradosOficiales }, 
            activo: { $ne: false } 
        };

        // Filtro de unidad: Busca en 'unidad' o 'elemento' para no perder pilotos
        const esMandoSuperior = ['ADMIN', 'DIRECTOR', 'BOSS', 'OTO'].includes(roleBase);
        
        if (!esMandoSuperior && unidad) {
            const unidadLimpia = unidad.trim().toUpperCase();
            queryOficiales.$or = [
                { unidad: unidadLimpia },
                { elemento: unidadLimpia }
            ];
        }

        // Búsqueda en paralelo de pilotos y sus planes
        const [oficiales, planes] = await Promise.all([
            Tripulante.find(queryOficiales).sort({ grado: 1, apellido: 1 }).lean(),
            ExigenciaPlan.find({ año: currentAnio }).lean()
        ]);

        // Merge de datos: Si el piloto no tiene plan, inyectamos uno vacío en memoria
        const respuesta = oficiales.map(oficial => {
            const planExistente = planes.find(p => p.piloto?.toString() === oficial._id?.toString());
            
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

        res.status(200).json(respuesta);

    } catch (error) {
        console.error("❌ ERROR EBM_CONTROLLER:", error.message);
        res.status(500).json({ mensaje: "Error interno del servidor", detalle: error.message });
    }
};

// 2. Guardar o actualizar plan
exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        if (!pilotoId || !año) {
            return res.status(400).json({ mensaje: "Faltan IDs o Año" });
        }

        const unidadLimpia = unidad ? unidad.toUpperCase().trim() : "";

        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { 
                trimestres, 
                unidad: unidadLimpia, 
                piloto: pilotoId,
                año: Number(año) 
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, plan });

    } catch (error) {
        console.error("❌ ERROR AL GUARDAR PLAN:", error.message);
        res.status(500).json({ mensaje: "Error al guardar" });
    }
};