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
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

/**
 * 2. Consultar flota completa / Filtrada
 * Se coloca arriba para que el "/" no sea capturado por el parámetro ":elemento"
 */
router.get('/', aircraftController.getAircrafts);

/**
 * 3. Crear nueva aeronave
 * Permitido para admin, BOSS, DIRECTOR, OTO, OFICINA_TECNICA y S4_UNIDAD.
 */
router.post(
    '/', 
    authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.createAircraft
);

/**
 * 4. Consultar disponibilidad por Elemento (ESENCIAL PARA CARGA TÁCTICA)
 * Se mantienen ambas para asegurar compatibilidad total.
 */

// Versión con prefijo /elemento/
router.get(
    '/elemento/:elemento', 
    authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), 
    aircraftController.getAircraftsByElemento || aircraftController.getAircrafts
);

// Versión directa (Búsqueda del frontend para evitar 404)
router.get(
    '/:elemento', 
    authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), 
    aircraftController.getAircraftsByElemento || aircraftController.getAircrafts
);

/**
 * 5. Actualizar Estado/Horas/Novedades (Punto de Gestión Técnica)
 * Nota: El ID de MongoDB suele ser más largo que el nombre de un elemento, 
 * pero Express prioriza por orden de llegada.
 */
router.put(
    '/:id', 
    authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.updateAircraftStatus
);

/**
 * 6. Eliminar aeronave del sistema (Acción crítica)
 */
router.delete(
    '/:id', 
    authorize('admin', 'BOSS', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.deleteAircraft
);

module.exports = router;