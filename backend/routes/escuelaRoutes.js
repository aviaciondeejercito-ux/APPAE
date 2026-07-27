const express = require('express');
const router = express.Router();
const escuelaController = require('../controllers/escuelaController');

// -----------------------------------------------------------------
// 1. RUTAS DE INSTRUCCIÓN Y MÉTRICAS
// -----------------------------------------------------------------
// Registrar evaluación (vuelo, académico, psicotécnico, físico)
router.post('/instruccion', escuelaController.registrarInstruccion);

// Dashboard / Métricas generales de la EC AE
router.get('/dashboard', escuelaController.getDashboardEscuela);

// Ficha individual completa del alumno
router.get('/alumno/:idAlumno', escuelaController.getFichaAlumno);

// -----------------------------------------------------------------
// 2. RUTAS DE CAMADA / NÓMINA ACTIVA DE ALUMNOS
// -----------------------------------------------------------------
// Guardar o actualizar la camada activa
router.post('/camada', escuelaController.guardarCamada);

// Obtener la camada activa con datos populados de alumnos
router.get('/camada/activa', escuelaController.getCamadaActiva);

// -----------------------------------------------------------------
// 3. RUTAS DEL GESTOR DE PATRONES DE VUELO (DINÁMICO)
// -----------------------------------------------------------------
// Obtener todos los patrones de vuelo (opcional filtro ?soloActivos=true)
router.get('/patrones-vuelo', escuelaController.getPatronesVuelo);

// Crear o actualizar un patrón de vuelo con sus maniobras/estándares
router.post('/patrones-vuelo', escuelaController.guardarPatronVuelo);

module.exports = router;