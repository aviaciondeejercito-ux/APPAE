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
                message: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no tiene permisos para esta gestión.` 
            });
        }
        next();
    };
};

// GRUPOS DE ACCESO (Mantenemos tu lógica unificada de gestión militar)
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];

// PROTECCIÓN GLOBAL: Todas las rutas de este módulo requieren token JWT válido
router.use(protect);

/**
 * =========================================================================
 * GESTIÓN DE PLANIFICACIÓN EBM
 * =========================================================================
 */

/**
 * @route   GET /api/ebm/planificacion-completa
 * @desc    Obtiene la nómina de pilotos activa filtrada por la jurisdicción/unidad del usuario
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
    ebmController.getVuelosUnidad // Apunta a la nueva lógica que desarrollaremos en el controlador
);

module.exports = router;