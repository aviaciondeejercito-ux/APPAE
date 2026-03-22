const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES
 * Funciones encargadas de la lógica de negocio del calendario AE.
 */
const { 
    getEvents, 
    getAvailableAircraft,
    getActiveOperations, // <--- NUEVA FUNCIÓN PARA EL MAPA TÁCTICO
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

// Verificación de compatibilidad del middleware de protección
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;

/**
 * SISTEMA GESTIÓN AE - CAPA DE RUTAS OPERATIVAS BLINDADAS
 * Jerarquía de permisos actualizada según Matriz Operativa:
 * - ADMIN: Acceso Total (Global).
 * - BOSS: Monitor Full, Carga Global/Individual, Edición y Baja (Criterio DIR AE).
 * - S4_UNIDAD / S4: Monitor de su Elemento y Carga (Criterio Unidad).
 * - USER: Carga y Monitor básico.
 */

// 1. Protección de Identidad (Token JWT) para todas las rutas del calendario
router.use(protect);

// 2. Definición de Rutas con Autorización Jerárquica

// @route    GET /api/events
// @desc     Obtener lista de eventos (El filtrado por unidad/global se procesa en el controlador)
router.get('/', getEvents);

// @route    GET /api/events/active-map
// @desc     Obtener operaciones en curso para el Mapa Táctico
// Permiso: Restringido a BOSS y ADMIN para control estratégico.
router.get('/active-map', authorize('boss', 'admin'), getActiveOperations);

// @route    GET /api/events/aircraft/:elemento
// @desc     Obtener aeronaves en servicio (E/S) específicas de una unidad
router.get('/aircraft/:elemento', getAvailableAircraft);

// @route    POST /api/events
// @desc     Registrar nueva actividad (Vuelos, Guardias, Logística)
router.post('/', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), createEvent);

// @route    PUT /api/events/:id
// @desc     Actualizar detalles de una actividad existente
router.put('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), updateEvent);

// @route    DELETE /api/events/:id
// @desc     Eliminación/Baja de actividad del registro
router.delete('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), deleteEvent);

module.exports = router;