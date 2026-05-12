const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');

// Ruta para traer los oficiales que deben cumplir EBM
router.get('/oficiales', ebmController.getOficialesEBM);

// Ruta para traer la planificación guardada de la unidad
router.get('/plan', ebmController.getPlanUnidad);

// Ruta para guardar o actualizar el plan de un piloto
router.post('/save', ebmController.savePlanIndividual);

module.exports = router;