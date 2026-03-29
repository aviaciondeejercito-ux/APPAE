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
 * Permitido para ADMIN, BOSS, DIRECTOR, OTO, OFICINA_TECNICA y S4_UNIDAD.
 * Se utiliza el estándar de guion bajo para coincidir con la DB.
 */
router.post('/', authorize('ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.createAircraft);

/**
 * 4. Actualizar Estado/Horas/Novedades (Punto de Gestión Técnica)
 * Habilita a OFICINA_TECNICA, S4_UNIDAD y roles de mando para gestionar el mantenimiento.
 */
router.put('/:id', authorize('ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.updateAircraftStatus);

/**
 * 5. Eliminar aeronave del sistema (Acción crítica)
 * Se habilita a ADMIN, BOSS, OFICINA_TECNICA y S4_UNIDAD para dar de baja registros oficiales.
 */
router.delete('/:id', authorize('ADMIN', 'BOSS', 'OFICINA_TECNICA', 'S4_UNIDAD'), aircraftController.deleteAircraft);

module.exports = router;