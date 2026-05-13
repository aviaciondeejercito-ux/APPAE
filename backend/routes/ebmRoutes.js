const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const authMiddleware = require('../middleware/authMiddleware');

// Usamos authMiddleware (o protect, como se llame en tu proyecto)
// Importante: La función en el controlador DEBE llamarse igual
router.get('/planificacion-completa', authMiddleware, ebmController.getPlanificacionCompleta);

module.exports = router;