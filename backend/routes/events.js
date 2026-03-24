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
 * - ADMIN / BOSS: Control Estratégico y Gestión Global.
 * - S4_UNIDAD / S4: Gestión y Monitoreo de su Elemento.
 * - USER: Carga de Vuelos y Monitor básico.
 */

// 1. Protección de Identidad (Token JWT) para todas las rutas
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS ---

// @route    GET /api/events
// @desc     Obtener lista de eventos (Calendario General filtrado por elemento)
router.get('/', getEvents);

// @route    GET /api/events/active-map
// @desc     Obtener misiones de VUELO TÁCTICO en curso para el Mapa
// @permiso  Habilitado para todos los niveles operativos para visualización de radar
router.get('/active-map', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), getActiveOperations);

// @route    GET /api/events/aircraft/:elemento
// @desc     Obtener aeronaves E/S (En Servicio) para el selector del Vuelo Táctico
router.get('/aircraft/:elemento', getAvailableAircraft);

// @route    POST /api/events
// @desc     Registrar VUELO TÁCTICO o Actividad de Calendario
router.post('/', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), createEvent);

// @route    PUT /api/events/:id
// @desc     Actualizar misión (Cambio de ubicación, info marginal o estado)
router.put('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), updateEvent);

// @route    DELETE /api/events/:id
// @desc     Baja de misión o evento del sistema (Solo niveles de gestión)
// @nota     Se recomienda restringir a S4 en adelante para evitar borrados accidentales
router.delete('/:id', authorize('s4', 's4_unidad', 'boss', 'admin'), deleteEvent);

module.exports = router;