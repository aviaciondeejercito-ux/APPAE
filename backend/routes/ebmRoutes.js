const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware');

/**
 * RUTAS DE EXIGENCIAS BÁSICAS MÍNIMAS (EBM)
 * El prefijo '/api/ebm' ya viene definido desde el server.js central.
 */

// Esta ruta responderá a: GET /api/ebm/planificacion-completa
router.get('/planificacion-completa', protect, ebmController.getPlanificacionCompleta);

// Esta ruta responderá a: POST /api/ebm/save
router.post('/save', protect, ebmController.savePlanIndividual);

module.exports = router;