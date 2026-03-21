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
 * Permitido para cualquier usuario logueado. 
 * El controlador filtra internamente qué unidad ve cada uno.
 */
router.get('/', aircraftController.getAircrafts);

/**
 * 3. Crear nueva aeronave
 * Permitido para Admin, Boss y los roles de S4 (Unidad o Genérico).
 */
router.post('/', authorize('admin', 'boss', 's4', 'S4_UNIDAD'), aircraftController.createAircraft);

/**
 * 4. Actualizar Estado/Horas/Novedades (EL PUNTO CRÍTICO)
 * Se asegura que 's4' y 'S4_UNIDAD' tengan acceso junto a la cadena de mando.
 * Esto habilita el botón de "Actualizar Registro" desde el frontend.
 */
router.put('/:id', authorize('admin', 'boss', 's4', 'S4_UNIDAD'), aircraftController.updateAircraftStatus);

/**
 * 5. Eliminar aeronave del sistema (Acción crítica)
 * Restringido estrictamente a Administradores.
 */
router.delete('/:id', authorize('admin'), aircraftController.deleteAircraft);

module.exports = router;