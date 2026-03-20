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
 * 'protect' verifica el token; 'authorize' verifica el rango jerárquico.
 */
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

const protect = typeof authMiddleware === 'function' ? authMiddleware : authMiddleware.protect;

/**
 * SISTEMA GESTIÓN AE - CAPA DE RUTAS OPERATIVAS BLINDADAS
 * Jerarquía de permisos según Matriz Operativa:
 * - BOSS: Monitor Full y Carga (Criterio DIR AE).
 * - USER / S4: Monitor de Elemento y Carga (Criterio Unidad).
 * - ADMIN: Acceso Total.
 */

// 1. Protección de Identidad (Token JWT) para todas las rutas
router.use(protect);

// 2. Definición de Rutas con Autorización Jerárquica

// @route   GET /api/events
// @desc    Obtener lista de eventos (Filtro interno por unidad en el controlador)
// Permiso: Todos los roles autenticados pueden visualizar.
router.get('/', getEvents);

// @route   POST /api/events
// @desc    Registrar nueva actividad (Vuelos, Guardias, Logística)
// Permiso: USER, S4, BOSS y ADMIN pueden cargar según su nivel.
router.post('/', authorize('user', 's4', 'boss', 'admin'), createEvent);

// @route   PUT /api/events/:id
// @desc    Actualizar detalles de una actividad existente
// Permiso: USER, S4 y BOSS (Solo ADMIN tiene control total de edición global).
router.put('/:id', authorize('user', 's4', 'boss', 'admin'), updateEvent);

// @route   DELETE /api/events/:id
// @desc    Eliminación/Baja de actividad del registro
// Permiso: Restringido para asegurar trazabilidad (USER/S4 solo sus propios eventos).
router.delete('/:id', authorize('user', 's4', 'admin'), deleteEvent);

module.exports = router;