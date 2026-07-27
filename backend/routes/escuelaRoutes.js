const express = require('express');
const router = express.Router();
const escuelaController = require('../controllers/escuelaController');

// Rutas de instrucción y métricas
router.post('/instruccion', escuelaController.registrarInstruccion);
router.get('/dashboard', escuelaController.getDashboardEscuela);
router.get('/alumno/:idAlumno', escuelaController.getFichaAlumno);

// Rutas de camada / nómina activa de alumnos
router.post('/camada', escuelaController.guardarCamada);
router.get('/camada/activa', escuelaController.getCamadaActiva);

module.exports = router;