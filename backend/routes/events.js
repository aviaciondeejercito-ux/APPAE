const express = require('express');
const router = express.Router();

/**
 * IMPORTACIÓN DE CONTROLADORES
 * Funciones encargadas de la lógica de negocio del calendario AE.
 */
const { 
    getEvents, 
    getAvailableAircraft, // NUEVA FUNCIÓN AGREGADA
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
// Permiso: Todos los roles autenticados pueden visualizar.
router.get('/', getEvents);

// @route    GET /api/events/aircraft/:elemento
// @desc     Obtener aeronaves en servicio (E/S) específicas de una unidad
// Permiso: Todos los roles autenticados para que puedan ver disponibilidad al cargar.
router.get('/aircraft/:elemento', getAvailableAircraft);

// @route    POST /api/events
// @desc     Registrar nueva actividad (Vuelos, Guardias, Logística)
// Permiso: USER, S4, S4_UNIDAD, BOSS y ADMIN pueden cargar.
router.post('/', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), createEvent);

// @route    PUT /api/events/:id
// @desc     Actualizar detalles de una actividad existente
// Permiso: USER, S4, S4_UNIDAD, BOSS y ADMIN (BOSS tiene permisos de mando para corregir).
router.put('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), updateEvent);

// @route    DELETE /api/events/:id
// @desc     Eliminación/Baja de actividad del registro
// Permiso: BOSS y ADMIN tienen permiso de borrado total. USER/S4 según lógica interna.
// AJUSTE: Se incluye al BOSS para que pueda gestionar la limpieza del monitor.
router.delete('/:id', authorize('user', 's4', 's4_unidad', 'boss', 'admin'), deleteEvent);

module.exports = router;