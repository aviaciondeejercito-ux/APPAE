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
 * Permitido para Admin, Boss, roles de S4, S4_UNIDAD y OFICINA_TECNICA.
 */
router.post('/', authorize('admin', 'boss', 's4', 'S4_UNIDAD', 'OFICINA_TECNICA'), aircraftController.createAircraft);

/**
 * 4. Actualizar Estado/Horas/Novedades (EL PUNTO CRÍTICO)
 * Habilita a S4_UNIDAD y OFICINA_TECNICA para gestionar el mantenimiento y novedades.
 */
router.put('/:id', authorize('admin', 'boss', 's4', 'S4_UNIDAD', 'OFICINA_TECNICA'), aircraftController.updateAircraftStatus);

/**
 * 5. Eliminar aeronave del sistema (Acción crítica)
 * Se habilita a S4_UNIDAD junto con Admin y OFICINA_TECNICA para dar de baja registros.
 */
router.delete('/:id', authorize('admin', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.deleteAircraft);

module.exports = router;