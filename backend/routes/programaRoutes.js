const express = require('express'); 
const router = express.Router(); 
const programaController = require('../controllers/programaController'); 

// Rutas dedicadas a la gestión del plan de inspección
router.post('/guardar', programaController.guardarPrograma); 
router.get('/aeronave/:aeronaveId', programaController.obtenerProgramaPorAeronave); 

module.exports = router; 