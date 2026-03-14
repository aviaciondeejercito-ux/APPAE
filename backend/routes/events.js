const express = require('express');
const router = express.Router();

// 1. Importamos las funciones del controlador
const { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} = require('../controllers/eventController');

// 2. Importamos el middleware de seguridad
// ASEGURATE: authMiddleware debe exportarse como una función (module.exports = function...)
const authMiddleware = require('../middleware/authMiddleware');

/**
 * SISTEMA GESTIÓN AE - RUTAS PROTEGIDAS
 * Blindaje: El middleware verifica el token antes de entregar el control al controlador.
 */

// @route   GET /api/events
router.get('/', authMiddleware, getEvents);

// @route   POST /api/events
router.post('/', authMiddleware, createEvent);

// @route   PUT /api/events/:id
router.put('/:id', authMiddleware, updateEvent);

// @route   DELETE /api/events/:id
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;