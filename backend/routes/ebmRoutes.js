const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN - SINCRO JOKER v3.1
 * Corregido para detectar 'rol' o 'role' y evitar bloqueos en el ecosistema AE.
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // DETECCIÓN DINÁMICA: Buscamos en rol (ES) o role (EN)
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        // Si no hay rol o no está en la lista, denegamos
        if (!userRole || !permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                mensaje: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no tiene permisos para esta gestión.` 
            });
        }
        next();
    };
};

// GRUPOS DE ACCESO (Mantenemos tu lógica unificada de gestión militar)
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];

// Roles autorizados para modificar justificaciones, novedades o exigencias en la nómina EBM
const rolesEscritura = ['admin', 'OPERACIONES', 'JEFE', 'PERSONAL', 'OFICINA_TECNICA', 'OTO'];

// PROTECCIÓN GLOBAL: Todas las rutas de este módulo requieren token JWT válido
router.use(protect);

/**
 * =========================================================================
 * GESTIÓN DE PLANIFICACIÓN EBM
 * =========================================================================
 */

/**
 * @route   GET /api/ebm/planificacion-completa
 * @desc    Obtiene la nómina de pilotos activa filtrada por la jurisdicción/unidad del usuario (con horas desglosadas por SDA)
 */
router.get('/planificacion-completa', 
    authorize(...rolesConsulta), 
    ebmController.getPlanificacionCompleta
);

/**
 * @route   GET /api/ebm/vuelos-unidad
 * @desc    Obtiene el historial de vuelos del elemento operativo del usuario para el cálculo de horas acumuladas
 */
router.get('/vuelos-unidad',
    authorize(...rolesConsulta),
    ebmController.getVuelosUnidad
);

/**
 * @route   PUT /api/ebm/actualizar-configuracion/:id
 * @desc    Guarda o actualiza las novedades, justificaciones y exigencias EBM de un tripulante específico
 * @nota    ¡NUEVA RUTA ESENCIAL! Evita que los cambios del frontend se pierdan al recargar la página.
 */
router.put('/actualizar-configuracion/:id',
    authorize(...rolesEscritura),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { horasFaltantesSda, novedadesSda } = req.body;

            // Buscamos el tripulante y actualizamos el sub-objeto configuracionEbm
            const tripulanteActualizado = await Tripulante.findByIdAndUpdate(
                id,
                {
                    $set: {
                        'configuracionEbm.horasFaltantesSda': horasFaltantesSda || {},
                        'configuracionEbm.novedadesSda': novedadesSda || {}
                    }
                },
                { new: true, runValidators: true }
            );

            if (!tripulanteActualizado) {
                return res.status(404).json({ 
                    success: false, 
                    mensaje: "No se encontró el tripulante especificado." 
                });
            }

            res.status(200).json({
                success: true,
                mensaje: "Configuración EBM guardada correctamente de forma persistente.",
                data: tripulanteActualizado
            });

        } catch (error) {
            console.error("❌ ERROR AL GUARDAR PERSISTENCIA EBM:", error);
            res.status(500).json({ 
                success: false, 
                mensaje: "Error interno del servidor al procesar el guardado de la configuración." 
            });
        }
    }
);

module.exports = router;