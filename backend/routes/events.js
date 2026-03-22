const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES - SISTEMA GESTIÓN AE
 * Funciones encargadas de la lógica de negocio y despacho táctico.
 */
const { 
    getEvents, 
    getAvailableAircraft,
    getActiveOperations, // Para el Mapa Táctico (Tiempo Real)
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
 * - ADMIN / BOSS: Control Estratégico, Mapa Táctico y Gestión Global.
 * - S4_UNIDAD / S4: Gestión de su propio Elemento.
 * - USER: Carga de Vuelos y Monitor básico.
 */

// 1. Protección de Identidad (Token JWT) para todas las rutas del calendario/mapa
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS ---

// @route    GET /api/events
// @desc     Obtener lista de eventos (Calendario General)
router.get('/', getEvents);

// @route    GET /api/events/active-map
// @desc     Obtener misiones de VUELO TÁCTICO en curso para el Mapa
// @permiso  Restringido a BOSS y ADMIN (Nivel Comando)
router.get('/active-map', authorize('boss', 'admin'), getActiveOperations);

// @route    GET /api/events/aircraft/:elemento
// @desc     Obtener aeronaves E/S (En Servicio) para el selector del Vuelo Táctico
// @nota     Si elemento es 'all', el controlador devolverá la flota completa.
router.get('/aircraft/:elemento', getAvailableAircraft);

// @route    POST /api/events
// @desc     Registrar VUELO TÁCTICO o Actividad de Calendario
// @permiso  Cualquier usuario autenticado puede iniciar una carga
router.post('/', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), createEvent);

// @route    PUT /api/events/:id
// @desc     Actualizar datos de una misión (Cambio de ubicación o info marginal)
router.put('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), updateEvent);

// @route    DELETE /api/events/:id
// @desc     Baja de misión o evento del sistema
router.delete('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), deleteEvent);

module.exports = router;