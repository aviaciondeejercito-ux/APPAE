const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN
 * Como no tienes authorize.js, usamos esta función para validar roles
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Normalizamos el rol que viene del token (inyectado por 'protect')
        const userRole = req.user?.role?.toUpperCase().trim();
        
        if (!rolesPermitidos.map(r => r.toUpperCase()).includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El rol ${userRole} no tiene permisos.` 
            });
        }
        next();
    };
};

// --- TODAS LAS RUTAS REQUIEREN LOGIN ---
router.use(protect);

// 1. Rutas base: /api/tripulantes
router.route('/')
    .get(tripulanteController.obtenerTripulantes)
    // Solo permitimos crear a ADMIN o USER (puedes agregar 'OFICINA TECNICA' si existe)
    .post(authorize('admin', 'user', 'OFICINA TECNICA'), tripulanteController.crearTripulante); 

// 2. Búsqueda
router.get('/buscar/:termino', authorize('admin', 'user'), tripulanteController.buscarTripulante);

// 3. Gestión individual
router.route('/:id')
    .put(authorize('admin', 'user'), tripulanteController.actualizarTripulante) 
    .delete(authorize('admin'), tripulanteController.eliminarTripulante); 

// 4. Capacitaciones
router.post('/:id/capacitacion', authorize('admin', 'user'), tripulanteController.agregarCapacitacion);

module.exports = router;