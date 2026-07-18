const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

// 1. Capa de Aislamiento y Protección Global (JWT/Session)
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

/**
 * 2. RUTAS ESTÁTICAS PRINCIPALES
 */

// GET '/' -> Obtiene la flota filtrada por la unidad del token (o global si es mando)
router.get('/', aircraftController.getAircrafts);

// POST '/' -> Alta de aeronaves (Asigna unidad automáticamente si es un usuario enclaustrado)
router.post(
    '/', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4'
    ), 
    aircraftController.createAircraft
);

/**
 * 3. RUTAS CRÍTICAS POR ID
 */

// PUT '/:id' -> Edición de componentes, novedades o transferencia
router.put(
    '/:id', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4'
    ), 
    aircraftController.updateAircraftStatus
);

// DELETE '/:id' -> Eliminación física (El controlador restringe internamente a Mandos Estratégicos)
router.delete(
    '/:id', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4'
    ), 
    aircraftController.deleteAircraft
);

/**
 * 4. CONSULTA DIRIGIDA POR PARÁMETRO (Sincronizada con req.params.elemento)
 * Corregida para permitir que roles de Unidad puedan consultar su propio endpoint parametrizado sin rebotar en el Middleware.
 */
router.get(
    '/elemento/:elemento',
    authorize(
        'admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4', 'USER', 'user'
    ),
    aircraftController.getAircrafts
);

module.exports = router;