const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

/**
 * RUTAS DE MATERIAL AERONÁUTICO - SISTEMA AE
 * Seguridad jerárquica: Autenticación -> Autorización por Rol -> Lógica de Unidad.
 */

// 1. Todas las rutas de aeronaves requieren estar logueado (JWT Válido)
router.use(authMiddleware);

/**
 * 2. Ver flota
 * Permitido para cualquier usuario logueado (Admin, Boss, User, S4_UNIDAD).
 * El filtrado por 'elemento' (unidad) se ejecuta internamente en el controlador.
 */
router.get('/', aircraftController.getAircrafts);

/**
 * 3. Crear nueva aeronave
 * MODIFICACIÓN: Se otorga permiso al S4_UNIDAD para dar de alta material de su unidad.
 * También se incluye 'admin' por jerarquía técnica.
 */
router.post('/', authorize('admin', 'S4_UNIDAD'), aircraftController.createAircraft);

/**
 * 4. Actualizar Estado/Horas/Novedades
 * Permitido para Admin, Boss y S4_UNIDAD para permitir gestión operativa en tiempo real.
 */
router.put('/:id', authorize('admin', 'boss', 'S4_UNIDAD'), aircraftController.updateAircraftStatus);

/**
 * 5. Eliminar aeronave del sistema (Acción crítica)
 * SE MANTIENE: Restringido estrictamente a Administradores para evitar pérdida accidental de historial.
 */
router.delete('/:id', authorize('admin'), aircraftController.deleteAircraft);

module.exports = router;