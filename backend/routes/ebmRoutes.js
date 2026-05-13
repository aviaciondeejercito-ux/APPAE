const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware');

/**
 * ESTÁNDAR TÁCTICO: Las rutas son relativas al prefijo del server.js
 */

// Esto mapea a: GET /api/ebm/planificacion-completa
router.get('/planificacion-completa', protect, ebmController.getPlanificacionCompleta);

// Esto mapea a: POST /api/ebm/save
router.post('/save', protect, ebmController.savePlanIndividual);

module.exports = router;