const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');

// Importamos protect (autenticación) y admin (autorización)
const { protect, admin } = require('../middleware/authMiddleware'); 

/**
 * ESTÁNDAR DE SEGURIDAD AE
 * Protección de rutas de legajos y personal.
 */

// --- TODAS LAS RUTAS REQUIEREN LOGIN ---
// Bloqueo preventivo: Si no hay token, no hay acceso a los datos de personal.
router.use(protect);

// 1. Rutas base: /api/tripulantes
router.route('/')
    .get(tripulanteController.obtenerTripulantes) // El controlador filtra por Unidad/Rol
    .post(tripulanteController.crearTripulante); 

// 2. Búsqueda específica: /api/tripulantes/buscar/:termino
router.get('/buscar/:termino', tripulanteController.buscarTripulante);

// 3. Gestión individual: /api/tripulantes/:id
router.route('/:id')
    .put(tripulanteController.actualizarTripulante) 
    .delete(tripulanteController.eliminarTripulante); 

// 4. Rutas de actualizaciones específicas
router.post('/:id/capacitacion', tripulanteController.agregarCapacitacion);

/**
 * CORRECCIÓN CRÍTICA: 
 * Se comenta la siguiente línea porque la función 'actualizarCertificaciones' 
 * no está definida o exportada en tripulanteController.js, lo que causaba el crash.
 */
// router.put('/:id/certificaciones', tripulanteController.actualizarCertificaciones);

module.exports = router;