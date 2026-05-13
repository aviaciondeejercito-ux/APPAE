const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/ebm/planificacion-completa
router.get('/planificacion-completa', protect, ebmController.getPlanificacionCompleta);

// POST /api/ebm/save -> AQUÍ ESTABA EL ERROR (Línea 10)
// Verificá que diga ebmController.savePlanIndividual y que esa función esté exportada
router.post('/save', protect, ebmController.savePlanIndividual);

module.exports = router;