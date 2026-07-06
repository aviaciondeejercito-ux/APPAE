const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES - SISTEMA GESTIÓN AE
 */
const { 
    getEvents, 
    getAvailableAircraft,
    getActiveOperations, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} = require('../controllers/eventController');

/**
 * IMPORTACIÓN DE SEGURIDAD
 */
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

// LISTA OFICIAL DE ROLES SINCRO JOKER
const todosLosRoles = [
    'admin', 'BOSS', 'OTO', 'DIRECTOR', 'user', 
    'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'
];

// --- 1. PROTECCIÓN DE IDENTIDAD (TOKEN JWT) ---
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS (ORDEN CRÍTICO ANTI-COLLISION) ---

/**
 * @route    GET /api/events/active-map
 * @desc     Obtener misiones para el Mapa
 */
router.get('/active-map', authorize(...todosLosRoles), getActiveOperations);

/**
 * @route    GET /api/events/aircraft-available/:elemento
 * @desc     Consultar disponibilidad de aeronaves E/S
 */
router.get('/aircraft-available/:elemento', authorize(...todosLosRoles), getAvailableAircraft);

/**
 * @route    GET /api/events
 * @desc     Obtener lista de eventos (Calendario)
 */
router.get('/', authorize(...todosLosRoles), getEvents);

/**
 * @route    POST /api/events
 * @desc     Registrar nuevo VUELO TÁCTICO
 * @note     Restringimos a roles con capacidad de carga operativa
 */
router.post('/', authorize('admin', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'user'), createEvent);

/**
 * @route    PUT /api/events/:id
 * @desc     Actualizar misión
 * @note     Se añade restricción ([0-9a-fA-F]{24}) para que solo procese ObjectIds válidos de MongoDB
 */
router.put('/:id([0-9a-fA-F]{24})', authorize('admin', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'user'), updateEvent);

/**
 * @route    DELETE /api/events/:id
 * @desc     Eliminación de registro
 * @note     Se añade restricción ([0-9a-fA-F]{24}) para evitar colisiones con texto plano
 */
router.delete('/:id([0-9a-fA-F]{24})', authorize('admin', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE'), deleteEvent);

module.exports = router;