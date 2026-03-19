const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck'); // Importamos la función correcta

/**
 * RUTAS DE MATERIAL AERONÁUTICO - SISTEMA AE
 * Seguridad jerárquica: Autenticación -> Autorización por Rol (authorize) -> Lógica de Unidad.
 */

// Todas las rutas de aeronaves requieren estar logueado (JWT Válido)
router.use(authMiddleware);

// 1. Ver flota (Cualquier usuario logueado: Admin, Boss, S4_UNIDAD)
// El filtrado por 'elemento' se ejecuta internamente en el controlador.
router.get('/', aircraftController.getAircrafts);

// 2. Crear nueva aeronave (Restringido estrictamente a Administradores)
router.post('/', authorize('admin'), aircraftController.createAircraft);

// 3. Actualizar Estado/Horas/Novedades
// Permitido para Admin, Boss y S4_UNIDAD (La validación de unidad se hace en el controlador)
router.put('/:id', authorize('admin', 'boss', 'S4_UNIDAD'), aircraftController.updateAircraftStatus);

// 4. Eliminar aeronave del sistema (Acción crítica: Solo Admin)
router.delete('/:id', authorize('admin'), aircraftController.deleteAircraft);

module.exports = router;