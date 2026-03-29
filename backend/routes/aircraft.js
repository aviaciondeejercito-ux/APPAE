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
 * Permitido para ADMIN, BOSS, DIRECTOR, OTO y OFICINA_TECNICA (S4 UNIDAD).
 */
router.post('/', authorize('admin', 'boss', 'director', 'oto', 'OFICINA_TECNICA'), aircraftController.createAircraft);

/**
 * 4. Actualizar Estado/Horas/Novedades (EL PUNTO CRÍTICO)
 * Habilita a OFICINA_TECNICA (S4 UNIDAD) y roles técnicos para gestionar el mantenimiento.
 */
router.put('/:id', authorize('admin', 'boss', 'director', 'oto', 'OFICINA_TECNICA'), aircraftController.updateAircraftStatus);

/**
 * 5. Eliminar aeronave del sistema (Acción crítica)
 * Se habilita a ADMIN, BOSS y OFICINA_TECNICA (S4 UNIDAD) para dar de baja registros.
 */
router.delete('/:id', authorize('admin', 'boss', 'OFICINA_TECNICA'), aircraftController.deleteAircraft);

module.exports = router;