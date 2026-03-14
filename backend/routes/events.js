const express = require('express');
const router = express.Router();
const { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} = require('../controllers/eventController');

// Importamos los middlewares de seguridad (Asegúrate de que los nombres coincidan con tus archivos)
const authMiddleware = require('../middleware/authMiddleware');

/**
 * RUTAS DE EVENTOS - SISTEMA GESTIÓN AE
 * Todas las rutas están protegidas por authMiddleware.
 * La lógica de restricción para el 'Boss' se maneja internamente en el controlador.
 */

// @route   GET /api/events
// @desc    Obtener todos los eventos (Admin, Boss, User)
router.get('/', authMiddleware, getEvents);

// @route   POST /api/events
// @desc    Crear un nuevo evento (Admin, User)
router.post('/', authMiddleware, createEvent);

// @route   PUT /api/events/:id
// @desc    Editar un evento existente (Admin, User)
router.put('/:id', authMiddleware, updateEvent);

// @route   DELETE /api/events/:id
// @desc    Eliminar un evento (Admin, User)
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;