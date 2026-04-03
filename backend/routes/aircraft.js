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
 * 2. Consultar disponibilidad por Elemento (ESENCIAL PARA CARGA TÁCTICA)
 * Esta ruta resuelve el error 'undefined' al cargar el selector de aeronaves.
 * Nota: Los roles coinciden con el estándar (admin minúscula, OTO mayúscula).
 */
router.get(
    '/elemento/:elemento', 
    authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), 
    aircraftController.getAircraftsByElemento || aircraftController.getAircrafts
);

/**
 * 3. Ver flota completa / Filtrada
 * Permitido para cualquier usuario logueado. 
 * El controlador filtra internamente qué unidad ve cada uno según su jerarquía 
 * (admin/OTO ven todo, usuario ve su unidad).
 */
router.get('/', aircraftController.getAircrafts);

/**
 * 4. Crear nueva aeronave
 * Permitido para admin, BOSS, DIRECTOR, OTO, OFICINA_TECNICA y S4_UNIDAD.
 */
router.post(
    '/', 
    authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.createAircraft
);

/**
 * 5. Actualizar Estado/Horas/Novedades (Punto de Gestión Técnica)
 * Habilita a roles de gestión y mando para actualizar el estado operativo.
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