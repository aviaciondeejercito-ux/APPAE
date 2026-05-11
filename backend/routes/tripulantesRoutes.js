const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN
 * Valida que el rango/rol del usuario tenga acceso a la operación técnica.
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        const userRole = req.user?.role?.toUpperCase().trim();
        
        if (!rolesPermitidos.map(r => r.toUpperCase()).includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El rol ${userRole} no tiene permisos para esta acción.` 
            });
        }
        next();
    };
};

// --- TODAS LAS RUTAS REQUIEREN LOGIN ---
router.use(protect);

/**
 * 1. RUTAS BASE: /api/tripulantes
 */
router.route('/')
    .get(tripulanteController.obtenerTripulantes)
    .post(authorize('admin', 'user', 'OFICINA TECNICA'), tripulanteController.crearTripulante); 

/**
 * 2. GESTIÓN DE APTITUDES Y CALIFICACIONES (NUEVO)
 * Esta es la ruta para las habilitaciones acumulativas por Aeronave.
 */
router.post('/:id/habilitacion', 
    authorize('admin', 'user', 'OFICINA TECNICA'), 
    tripulanteController.gestionarHabilitacion
);

/**
 * 3. BÚSQUEDA Y GESTIÓN INDIVIDUAL
 */
router.get('/buscar/:termino', 
    authorize('admin', 'user', 'OFICINA TECNICA'), 
    tripulanteController.buscarTripulante
);

router.route('/:id')
    .put(authorize('admin', 'user', 'OFICINA TECNICA'), tripulanteController.actualizarTripulante) 
    .delete(authorize('admin'), tripulanteController.eliminarTripulante); 

/**
 * 4. CAPACITACIONES ESPECIALES (Cursos, NVG, etc.)
 */
router.post('/:id/capacitacion', 
    authorize('admin', 'user', 'OFICINA TECNICA'), 
    tripulanteController.agregarCapacitacion
);

module.exports = router;