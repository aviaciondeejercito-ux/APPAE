const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

/**
 * RUTAS DE MATERIAL AERONÁUTICO - SISTEMA AE
 * Seguridad jerárquica: Autenticación -> Autorización por Rol -> Lógica de Unidad.
 * ESTADO: ACTUALIZADO PARA DESPACHO TÁCTICO (SINCRO JOKER)
 */

// 1. Todas las rutas de aeronaves requieren estar logueado (JWT Válido)
// Se normaliza el uso del middleware de protección
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

/**
 * 2. Consultar disponibilidad por Elemento (ESENCIAL PARA CARGA TÁCTICA)
 * Esta ruta resuelve el error 'undefined' al cargar el selector de aeronaves.
 * Debe ir ANTES de las rutas con :id para evitar colisiones de Express.
 */
router.get('/elemento/:elemento', authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), aircraftController.getAircraftsByElemento || aircraftController.getAircrafts);

/**
 * 3. Ver flota completa / Filtrada
 * Permitido para cualquier usuario logueado. 
 * El controlador filtra internamente qué unidad ve cada uno según su jerarquía.
 */
router.get('/', aircraftController.getAircrafts);

/**
 * 4. Crear nueva aeronave
 * Permitido para ADMIN, BOSS, DIRECTOR, OTO, OFICINA_TECNICA y S4_UNIDAD.
 * El controlador permitirá al ADMIN elegir la unidad, y al resto le asignará la propia.
 */
router.post('/', authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.createAircraft);

/**
 * 5. Actualizar Estado/Horas/Novedades (Punto de Gestión Técnica)
 * Habilita a roles de gestión y mando para actualizar el estado operativo.
 */
router.put('/:id', authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.updateAircraftStatus);

/**
 * 6. Eliminar aeronave del sistema (Acción crítica)
 * Se habilita a ADMIN, BOSS, OFICINA_TECNICA y S4_UNIDAD para dar de baja registros oficiales.
 */
router.delete('/:id', authorize('admin', 'BOSS', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.deleteAircraft);

module.exports = router;