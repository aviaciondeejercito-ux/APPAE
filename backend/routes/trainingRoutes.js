const express = require('express');
const router = express.Router();
const controller = require('../controllers/trainingController');

// Obtener todas las planillas cargadas (necesario para tildes y validaciones)
router.get('/', controller.obtenerEntrenamientos);

// Crear o actualizar un registro de entrenamiento (Upsert)
router.post('/', controller.guardarEntrenamiento);

// Estadísticas acumuladas para el Dashboard
router.get('/dashboard-stats', controller.obtenerEstadisticasDashboard);

module.exports = router;