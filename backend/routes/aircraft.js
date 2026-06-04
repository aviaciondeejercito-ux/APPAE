const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

/**
 * RUTAS DE MATERIAL AERONÁUTICO - SISTEMA AE
 * Seguridad jerárquica: Autenticación -> Autorización por Rol -> Lógica de Unidad.
 */

// 1. Protección Global
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

/**
 * 2. RUTAS ESTÁTICAS Y ESPECÍFICAS (Deben ir primero)
 */
router.get('/', aircraftController.getAircrafts);

router.post(
    '/', 
    authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD', 'S4', 'OFICINA_CE_TECNICA'), 
    aircraftController.createAircraft
);

router.get(
    '/elemento/:elemento', 
    authorize('user', 'USER', 'S4_UNIDAD', 'S4', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin', 'ADMIN'), 
    aircraftController.getAircraftsByElemento
);

/**
 * 3. RUTAS POR ID (Operaciones sobre una aeronave específica)
 * Colocadas estratégicamente antes de la ruta de compatibilidad genérica.
 */
router.put(
    '/:id', 
    authorize('admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA', 'S4_UNIDAD', 'S4'), 
    aircraftController.updateAircraftStatus
);

router.delete(
    '/:id', 
    authorize('admin', 'ADMIN', 'BOSS', 'OTO', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA', 'S4_UNIDAD', 'S4'), 
    aircraftController.deleteAircraft
);

/**
 * 4. RUTA DE COMPATIBILIDAD (Comodín genérico al final)
 * Captura strings de unidad (ej: /CUEAE) sin interferir con los IDs de MongoDB.
 */
router.get(
    '/:elemento', 
    authorize('user', 'USER', 'S4_UNIDAD', 'S4', 'OFICINA_TECNICA', 'OFICINA_CE_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin', 'ADMIN'), 
    aircraftController.getAircraftsByElemento
);

module.exports = router;