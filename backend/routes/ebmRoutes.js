const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');

// Usamos el nombre correcto de la función definida en el controlador
router.get('/planificacion-completa', ebmController.getPlanificacionCompleta);

// Ruta para guardar o actualizar el plan de un piloto
router.post('/save', ebmController.savePlanIndividual);

module.exports = router;