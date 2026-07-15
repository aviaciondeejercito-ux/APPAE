const { Router } = require('express');
const router = Router();
const authMiddleware = require('../middleware/authMiddleware'); // Ajusta según tu ruta de middleware
const { getNovedadesElemento } = require('../controllers/DashboardController');

// Ruta protegida para obtener el panel informativo
router.get('/novedades', authMiddleware, getNovedadesElemento);

module.exports = router;