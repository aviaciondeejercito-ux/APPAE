const express = require('express'); 
const router = express.Router(); 
const programaController = require('../controllers/programaController'); 
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

// 1. Capa de Aislamiento e Inyección de Sesión Global (JWT)
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

// 2. Persistencia y Consulta Controlada del Plan Maestro de Mantenimiento
router.post(
    '/guardar', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 'OTOAE', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4'
    ),
    programaController.guardarPrograma
); 

router.get(
    '/aeronave/:aeronaveId', 
    authorize(
        'admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 'S4UNIDAD', 'USER', 'user'
    ),
    programaController.obtenerProgramaPorAeronave
); 

module.exports = router;