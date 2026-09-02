const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

// Capa de Aislamiento y Protección Global
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

// Rutas Generales y por Filtro
router.get('/', aircraftController.getAircrafts);
router.get('/elemento/:elemento', authorize('admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OFICINATECNICA', 'S4_UNIDAD', 'S4UNIDAD', 'S4', 'USER', 'user'), aircraftController.getAircrafts);
router.get('/matricula/:matricula', aircraftController.getAircraftByMatricula);

// Operaciones CUD (Create, Update, Delete)
router.post('/', authorize('admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OFICINATECNICA', 'S4_UNIDAD', 'S4UNIDAD', 'S4'), aircraftController.createAircraft);
router.put('/:id', authorize('admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OFICINATECNICA', 'S4_UNIDAD', 'S4UNIDAD', 'S4'), aircraftController.updateAircraftStatus);
router.delete('/:id', authorize('admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OFICINATECNICA', 'S4_UNIDAD', 'S4UNIDAD', 'S4'), aircraftController.deleteAircraft);

module.exports = router;