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

// Crear un nuevo patrón de vuelo
router.post('/patrones-vuelo', escuelaController.guardarPatronVuelo);

// 🛠️ ACTUALIZAR un patrón de vuelo existente por ID
router.put('/patrones-vuelo/:id', escuelaController.guardarPatronVuelo);

// 🗑️ ELIMINAR un patrón de vuelo por ID (si está implementado en tu controlador)
if (escuelaController.deletePatronVuelo) {
    router.delete('/patrones-vuelo/:id', escuelaController.deletePatronVuelo);
}

module.exports = router;