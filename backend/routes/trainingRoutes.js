const express = require('express');
const router = express.Router();
const controller = require('../controllers/trainingController');

router.post('/', controller.guardarEntrenamiento);
router.get('/dashboard-stats', controller.obtenerEstadisticasDashboard);

module.exports = router;