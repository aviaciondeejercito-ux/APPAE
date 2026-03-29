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
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;

/**
 * SISTEMA GESTIÓN AE - CAPA DE RUTAS OPERATIVAS BLINDADAS
 * Jerarquía de permisos actualizada según Matriz Operativa (Sincro Joker):
 * - ADMIN / BOSS / DIRECTOR / OTO / OTOAE: Control Estratégico y Gestión Global.
 * - S4_UNIDAD / S4 / OFICINA_TECNICA: Gestión y Monitoreo de su Elemento.
 * - USER: Carga de Vuelos y Monitor básico.
 */

// --- 1. PROTECCIÓN DE IDENTIDAD (TOKEN JWT) ---
// Se aplica a todas las rutas subsiguientes para garantizar la trazabilidad
router.use(protect);

// --- 2. DEFINICIÓN DE RUTAS OPERATIVAS ---

// @route    GET /api/events
// @desc     Obtener lista de eventos (Calendario General y Monitor filtrado por elemento)
// @permiso  Visualización según perfil de usuario y unidad
// Se agregan los nuevos roles para permitir la carga del componente inicial
router.get('/', authorize('user', 's4', 's4_unidad', 'oficina_tecnica', 'oto', 'otoae', 'director', 'boss', 'admin'), getEvents);

// @route    GET /api/events/active-map
// @desc     Obtener misiones de VUELO TÁCTICO en curso para el Mapa (Frecuencia de Radar)
// @permiso  Acceso universal autenticado para visualización de situación táctica
router.get('/active-map', authorize('user', 's4', 's4_unidad', 'oficina_tecnica', 'oto', 'otoae', 'director', 'boss', 'admin'), getActiveOperations);

// @route    GET /api/events/aircraft/:elemento
// @desc     Consultar disponibilidad de aeronaves E/S (En Servicio) para carga técnica
// @permiso  Personal con capacidad de carga
router.get('/aircraft/:elemento', authorize('user', 's4', 's4_unidad', 'oficina_tecnica', 'oto', 'otoae', 'director', 'boss', 'admin'), getAvailableAircraft);

// @route    POST /api/events
// @desc     Registrar VUELO TÁCTICO o Actividad de Monitor (Nueva Carga de Misión)
// @permiso  Todo el personal autorizado para iniciar operaciones
router.post('/', authorize('user', 's4', 's4_unidad', 'oficina_tecnica', 'oto', 'otoae', 'director', 'boss', 'admin'), createEvent);

// @route    PUT /api/events/:id
// @desc     Actualizar misión (Cambio de ubicación, tripulación, info marginal o etapa)
// @permiso  Personal encargado del seguimiento de la misión
router.put('/:id', authorize('user', 's4', 's4_unidad', 'oficina_tecnica', 'oto', 'otoae', 'director', 'boss', 'admin'), updateEvent);

// @route    DELETE /api/events/:id
// @desc     Baja de misión o evento del sistema (Protocolo de Seguridad)
router.delete('/:id', authorize('user', 's4', 's4_unidad', 'oficina_tecnica', 'oto', 'otoae', 'director', 'boss', 'admin'), deleteEvent);

module.exports = router;