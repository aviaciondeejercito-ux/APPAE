const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES
 * Funciones encargadas de la lógica de negocio del calendario AE.
 */
const { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} = require('../controllers/eventController');

/**
 * IMPORTACIÓN DE SEGURIDAD
 * Usamos un fallback dinámico para asegurar que 'protect' siempre sea una función válida,
 * evitando el error de 'middleware function' en el despliegue de Render.
 */
const authMiddleware = require('../middleware/authMiddleware');
const protect = typeof authMiddleware === 'function' ? authMiddleware : authMiddleware.protect;

/**
 * SISTEMA GESTIÓN AE - CAPA DE RUTAS OPERATIVAS
 * Todas las rutas están blindadas. El operador debe estar autenticado para:
 * Visualizar (GET), Agendar (POST), Modificar (PUT) o Dar de baja (DELETE).
 */

// Aplicar protección global a todas las rutas de este módulo
router.use(protect);

// @route   GET /api/events
// @desc    Obtener lista de eventos (Vuelos, Guardias, Mantenimiento)
router.get('/', getEvents);

// @route   POST /api/events
// @desc    Registrar nueva actividad en el calendario
router.post('/', createEvent);

// @route   PUT /api/events/:id
// @desc    Actualizar detalles de una actividad existente
router.put('/:id', updateEvent);

// @route   DELETE /api/events/:id
// @desc    Eliminación/Baja de actividad del registro
router.delete('/:id', deleteEvent);

module.exports = router;