const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware');

router.get('/planificacion-completa', protect, ebmController.getPlanificacionCompleta);

module.exports = router;