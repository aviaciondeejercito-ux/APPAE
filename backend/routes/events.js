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
 * Jerarquía de permisos actualizada según Matriz Operativa:
 * - Niveles de Mando (ADMIN, BOSS, DIRECTOR, OTO, OTOAE): Visión Global.
 * - Niveles de Elemento (S4_UNIDAD, OFICINA_TECNICA): Gestión de Unidad.
 * - Nivel Operativo (USER): Carga y monitoreo.
 */

// --- 1. PROTECCIÓN DE IDENTIDAD (TOKEN JWT) ---
// Trazabilidad completa: Ninguna ruta es accesible sin validación previa del Oficial de Turno/Usuario.
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS (ORDEN CRÍTICO) ---
// IMPORTANTE: Las rutas estáticas van ANTES de las rutas con parámetros (:id) para evitar colisiones de Express.

/**
 * @route    GET /api/events/active-map
 * @desc     Obtener misiones de VUELO TÁCTICO en curso para el Mapa (Exclusivo CargaTactica)
 * @access   Protegido - Sincro Real-Time
 */
router.get('/active-map', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), getActiveOperations);

/**
 * @route    GET /api/events/aircraft/:elemento
 * @desc     Consultar disponibilidad de aeronaves E/S (En Servicio) para carga técnica
 * @access   Protegido - Gestión de Elemento
 */
router.get('/aircraft/:elemento', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), getAvailableAircraft);

/**
 * @route    GET /api/events
 * @desc     Obtener lista de eventos (Filtra automáticamente isRealTime: false en el controlador)
 * @access   Protegido - Calendario/Log
 */
router.get('/', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), getEvents);

/**
 * @route    POST /api/events
 * @desc     Registrar nuevo VUELO TÁCTICO (CargaTactica) o Actividad de Monitor (Calendario)
 * @access   Protegido - Creación Atómica
 */
router.post('/', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), createEvent);

/**
 * @route    PUT /api/events/:id
 * @desc     Actualizar misión (Cambio de ubicación, tripulación o etapa operativa)
 * @access   Protegido - Permisos por Unidad/Dueño
 */
router.put('/:id', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), updateEvent);

/**
 * @route    DELETE /api/events/:id
 * @desc     Eliminación de registro y limpieza de rastro en Radar/Calendario
 * @access   Protegido - Permisos por Unidad/Dueño
 */
router.delete('/:id', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), deleteEvent);

module.exports = router;