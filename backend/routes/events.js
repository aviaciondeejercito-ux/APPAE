const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Fase Rutas)
 * - Despacho Táctico: getActiveOperations para Mapa en Tiempo Real.
 * - Gestión Técnica: getAvailableAircraft para disponibilidad E/S.
 * - Separación de Dominios: Rutas blindadas para Calendario y Mapa.
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
 * 'protect' verifica el token; 'authorize' verifica el rango jerárquico.
 */
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

// Normalización del middleware de protección (Blindaje de Referencia)
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;

/**
 * SISTEMA GESTIÓN AE - CAPA DE RUTAS OPERATIVAS BLINDADAS
 * Jerarquía de permisos actualizada según Matriz Operativa.
 */

// --- 1. PROTECCIÓN DE IDENTIDAD (TOKEN JWT) ---
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS (ORDEN CRÍTICO) ---

/**
 * @route    GET /api/events/active-map
 * @desc     Obtener misiones de VUELO TÁCTICO en curso para el Mapa
 */
router.get('/active-map', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), getActiveOperations);

/**
 * @route    GET /api/events/aircraft-available/:elemento
 * @desc     Consultar disponibilidad de aeronaves E/S para la unidad específica
 * @note     Se ajusta el path para coincidir con la llamada del controlador
 */
router.get('/aircraft-available/:elemento', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), getAvailableAircraft);

/**
 * @route    GET /api/events
 * @desc     Obtener lista de eventos (Filtra automáticamente isRealTime: false)
 */
router.get('/', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), getEvents);

/**
 * @route    POST /api/events
 * @desc     Registrar nuevo VUELO TÁCTICO o Actividad de Monitor
 */
router.post('/', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), createEvent);

/**
 * @route    PUT /api/events/:id
 * @desc     Actualizar misión (Cambio de ubicación, tripulación o etapa operativa)
 */
router.put('/:id', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), updateEvent);

/**
 * @route    DELETE /api/events/:id
 * @desc     Eliminación de registro y limpieza de rastro
 */
router.delete('/:id', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), deleteEvent);

module.exports = router;