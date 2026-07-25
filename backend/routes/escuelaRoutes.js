const express = require('express');
const router = express.Router();
const escuelaController = require('../controllers/escuelaController');

router.post('/instruccion', escuelaController.registrarInstruccion);
router.get('/dashboard', escuelaController.getDashboardEscuela);
router.get('/alumno/:idAlumno', escuelaController.getFichaAlumno);

module.exports = router;