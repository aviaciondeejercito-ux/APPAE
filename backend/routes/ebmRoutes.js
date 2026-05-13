const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware');

/**
 * RUTAS DE EXIGENCIAS BÁSICAS MÍNIMAS (EBM)
 * Vinculadas al estándar de seguridad Sincro Joker v3.5
 */

// Obtener la planificación completa (Cruza Tripulantes con ExigenciaPlan)
// El prefijo /api/ebm se define en el server.js central
router.get(
    '/planificacion-completa', 
    protect, 
    ebmController.getPlanificacionCompleta
);

// Guardar o actualizar el plan trimestral de un piloto específico
router.post(
    '/save', 
    protect, 
    ebmController.savePlanIndividual
);

module.exports = router;