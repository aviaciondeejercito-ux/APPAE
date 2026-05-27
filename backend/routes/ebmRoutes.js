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
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!userRole || !permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                mensaje: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no tiene permisos para esta gestión.` 
            });
        }
        next();
    };
};

// GRUPOS DE ACCESO 
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];
const rolesEscritura = ['admin', 'OPERACIONES', 'JEFE', 'PERSONAL', 'OFICINA_TECNICA', 'OTO'];

// PROTECCIÓN GLOBAL: Todas las rutas de este módulo requieren token JWT válido
router.use(protect);

/**
 * =========================================================================
 * GESTIÓN DE PLANIFICACIÓN EBM (AÑO 2026)
 * =========================================================================
 */

/**
 * @route   GET /api/ebm/planificacion-completa
 * @desc    Obtiene la nómina de pilotos activa con horas y exigencias calculadas por SDA
 */
router.get('/planificacion-completa', 
    authorize(...rolesConsulta), 
    ebmController.getPlanificacionCompleta
);

/**
 * @route   GET /api/ebm/vuelos-unidad
 * @desc    Obtiene el historial de vuelos del elemento operativo del usuario
 */
router.get('/vuelos-unidad',
    authorize(...rolesConsulta),
    ebmController.getVuelosUnidad
);

/**
 * @route   PUT /api/ebm/actualizar-configuracion/:id
 * @desc    Guarda de manera persistente las asignaciones y justificaciones en ExigenciaPlan
 * @nota    Modificado para acoplarse al controlador y al esquema de persistencia unificado por SDA.
 */
router.put('/actualizar-configuracion/:id',
    authorize(...rolesEscritura),
    ebmController.actualizarConfiguracionEbm // <-- Pasado al controlador para mantener la arquitectura MVC limpia
);

module.exports = router;