const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');

// Importamos protect (autenticación)
const { protect } = require('../middleware/authMiddleware'); 

/**
 * ESTÁNDAR DE SEGURIDAD AE
 * Protección de rutas de legajos y personal.
 */

// --- TODAS LAS RUTAS REQUIEREN LOGIN ---
router.use(protect);

// 1. Rutas base: /api/tripulantes
// GET: Obtener todos (el controlador filtra por Unidad si no es Admin)
// POST: Crear nuevo (el controlador valida que sea Admin o de la misma Unidad)
router.route('/')
    .get(tripulanteController.obtenerTripulantes)
    .post(tripulanteController.crearTripulante); 

// 2. Búsqueda específica: /api/tripulantes/buscar/:termino
router.get('/buscar/:termino', tripulanteController.buscarTripulante);

// 3. Gestión individual: /api/tripulantes/:id
router.route('/:id')
    .put(tripulanteController.actualizarTripulante) 
    .delete(tripulanteController.eliminarTripulante); 

// 4. Rutas de actualizaciones específicas (Capacitaciones especiales)
router.post('/:id/capacitacion', tripulanteController.agregarCapacitacion);

/**
 * NOTA TÉCNICA: 
 * La actualización de certificaciones (psicofísico/CRM) se maneja 
 * a través de la ruta PUT general (/:id) enviando el objeto 'certificaciones'.
 */

module.exports = router;