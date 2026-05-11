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
 * 2. RUTAS ESTÁTICAS (Deben ir primero)
 */
router.get('/', aircraftController.getAircrafts);

router.post(
    '/', 
    authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.createAircraft
);

/**
 * 3. RUTAS CON PREFIJO ESPECÍFICO
 * Esto evita confusiones con los IDs de MongoDB.
 */
router.get(
    '/elemento/:elemento', 
    authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), 
    aircraftController.getAircraftsByElemento
);

/**
 * 4. RUTAS POR ID (Operaciones sobre una aeronave específica)
 * Se colocan al final para que no capturen las rutas anteriores.
 */
router.put(
    '/:id', 
    authorize('admin', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.updateAircraftStatus // Aquí es donde se guarda el RAAC 91.207
);

router.delete(
    '/:id', 
    authorize('admin', 'BOSS', 'OFICINA_TECNICA', 'S4_UNIDAD'), 
    aircraftController.deleteAircraft
);

/**
 * 5. RUTA DE COMPATIBILIDAD (Opcional)
 * Solo si el frontend hace llamadas directas como /api/aircraft/CUEAE
 */
router.get(
    '/:elemento', 
    authorize('user', 'S4_UNIDAD', 'OFICINA_TECNICA', 'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin'), 
    aircraftController.getAircraftsByElemento
);

module.exports = router;