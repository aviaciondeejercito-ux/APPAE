const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const authMiddleware = require('../middleware/authMiddleware'); // Asegura que solo usuarios logueados accedan

// Ruta para obtener la tabla completa (Pilotos + Horas + Plan)
router.get('/planificacion-completa', authMiddleware, ebmController.getPlanificacionCompleta);

// Ruta para guardar o actualizar un plan individual
router.post('/save', authMiddleware, ebmController.savePlanIndividual);

module.exports = router;