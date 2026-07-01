const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const { protect } = require('../middleware/authMiddleware');

// Middleware de autorización - Sincro JOKER v3.6
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!userRole || !permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                mensaje: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no posee privilegios.` 
            });
        }
        next();
    };
};

const rolesPermitidosAlertas = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];

// Aplicar protección de sesión obligatoria y mapear endpoint
router.get('/dashboard', protect, authorize(...rolesPermitidosAlertas), alertsController.getAlertasInternasUnidad);

module.exports = router;