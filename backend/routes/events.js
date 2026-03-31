const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES - SISTEMA GESTIÓN AE
 * Funciones encargadas de la lógica de negocio y despacho táctico.
 * ESTADO: ACTUALIZADO PARA MONITOR DE ACTIVIDADES Y CARGA TÁCTICA
 */
const { 
    getEvents, 
    getAvailableAircraft,
    getActiveOperations, // Crucial para el Mapa Táctico
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

// Verificación de redundancia en middleware de protección
// Soporta diferentes implementaciones de nombres de función en authMiddleware
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;

/**
 * SISTEMA GESTIÓN AE - CAPA DE RUTAS OPERATIVAS BLINDADAS
 * Jerarquía de permisos actualizada según Matriz Operativa (Sincro Joker):
 * - ADMIN / BOSS / DIRECTOR / OTO / OTOAE: Control Estratégico y Gestión Global.
 * - S4_UNIDAD / OFICINA_TECNICA: Gestión y Monitoreo de su Elemento.
 * - USER: Carga de Vuelos y Monitor básico.
 */

// --- 1. PROTECCIÓN DE IDENTIDAD (TOKEN JWT) ---
// Se aplica a todas las rutas subsiguientes para garantizar la trazabilidad
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS ---
// Nota: Los roles se pasan en mayúsculas para coincidir con el Estándar de Seguridad.

// @route    GET /api/events
// @desc     Obtener lista de eventos (Calendario General y Monitor filtrado por elemento)
// @permiso  Visualización según perfil de usuario y unidad
router.get('/', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), getEvents);

// @route    GET /api/events/active-map
// @desc     Obtener misiones de VUELO TÁCTICO en curso para el Mapa (Frecuencia de Radar)
// @permiso  Acceso universal autenticado para visualización de situación táctica
router.get('/active-map', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), getActiveOperations);

// @route    GET /api/events/aircraft/:elemento
// @desc     Consultar disponibilidad de aeronaves E/S (En Servicio) para carga técnica
// @permiso  Personal con capacidad de carga táctica
router.get('/aircraft/:elemento', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), getAvailableAircraft);

// @route    POST /api/events
// @desc     Registrar VUELO TÁCTICO o Actividad de Monitor (Nueva Carga de Misión)
// @permiso  Todo el personal autorizado para iniciar operaciones
router.post('/', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), createEvent);

// @route    PUT /api/events/:id
// @desc     Actualizar misión (Cambio de ubicación, tripulación, info marginal o etapa)
// @permiso  Personal encargado del seguimiento de la misión o Unidad Asignada
router.put('/:id', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), updateEvent);

// @route    DELETE /api/events/:id
// @desc     Baja de misión o evento del sistema (Protocolo de Seguridad)
// @permiso  Personal con autoridad sobre el registro
router.delete('/:id', authorize('USER', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'ADMIN'), deleteEvent);

module.exports = router;