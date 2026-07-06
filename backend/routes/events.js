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

// LISTA OFICIAL DE ROLES SINCRO JOKER (Normalizados en Mayúsculas para evitar fallas)
const todosLosRoles = [
    'ADMIN', 'BOSS', 'OTO', 'DIRECTOR', 'USER', 
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
 * @desc     Consultar disponibilidad de aeronaves E/S (Filtro por Unidad Operativa)
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
 */
router.post('/', authorize('ADMIN', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'USER'), createEvent);

/**
 * @route    PUT /api/events/:id
 * @desc     Actualizar misión (Restricción ObjectId 24 caracteres)
 */
router.put('/:id([0-9a-fA-F]{24})', authorize('ADMIN', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'USER'), updateEvent);

/**
 * @route    DELETE /api/events/:id
 * @desc     Eliminación de registro (Restricción ObjectId 24 caracteres)
 */
router.delete('/:id([0-9a-fA-F]{24})', authorize('ADMIN', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE'), deleteEvent);

module.exports = router;