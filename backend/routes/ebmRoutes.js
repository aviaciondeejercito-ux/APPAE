const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN - SINCRO JOKER v3.1
 * Corregido para detectar 'rol' o 'role' y evitar bloqueos.
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

// GRUPOS DE ACCESO (Mantenemos tu lógica de gestión militar)
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];

// PROTECCIÓN GLOBAL
router.use(protect);

/**
 * GESTIÓN DE PLANIFICACIÓN - FILTRADO POR PILOTOS DE LA UNIDAD
 */
router.get('/planificacion-completa', 
    authorize(...rolesConsulta), 
    ebmController.getPlanificacionCompleta
);

module.exports = router;