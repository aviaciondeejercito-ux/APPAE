const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');

// Importamos protect (autenticación) y admin (autorización)
const { protect, admin } = require('../middleware/authMiddleware'); 

// --- TODAS LAS RUTAS REQUIEREN LOGIN ---
// Al ponerlo aquí, protegemos todas las rutas que siguen sin repetirlo
router.use(protect);

// 1. Rutas base: /api/tripulantes
router.route('/')
    .get(tripulanteController.obtenerTripulantes) // User ve su unidad, Admin ve todo
    .post(tripulanteController.crearTripulante);  // El controlador ya valida unidad/role

// 2. Búsqueda específica: /api/tripulantes/buscar/perez
// El controlador filtra resultados por unidad automáticamente si no es admin
router.get('/buscar/:termino', tripulanteController.buscarTripulante);

// 3. Gestión individual: /api/tripulantes/:id
router.route('/:id')
    .put(tripulanteController.actualizarTripulante) // Actualiza datos y registra Auditoría
    // Si prefieres que SOLO el Admin borre personal, podrías usar: .delete(admin, tripulanteController.eliminarTripulante)
    // Pero por ahora lo dejamos según tu lógica de controlador:
    .delete(tripulanteController.eliminarTripulante); 

// 4. Rutas de actualizaciones específicas (Estructuras complejas)
// Estas rutas disparan los logs de auditoría específicos definidos en el controlador
router.post('/:id/capacitacion', tripulanteController.agregarCapacitacion);

// Nota: Asegúrate de que esta función esté definida en tu controlador para evitar errores
router.put('/:id/certificaciones', tripulanteController.actualizarCertificaciones);

module.exports = router;