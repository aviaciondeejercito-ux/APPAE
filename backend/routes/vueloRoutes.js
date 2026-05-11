const express = require('express');
const router = express.Router();
const vueloController = require('../controllers/vueloController');
const { protect } = require('../middleware/authMiddleware');

/**
 * RUTAS DE GESTIÓN DE VUELOS - SISTEMA GESTIÓN AE
 * Todas las rutas requieren autenticación.
 */

// Aplicar protección a todas las rutas del módulo
router.use(protect);

// Middleware opcional para restringir por roles si fuera necesario
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ mensaje: "No autorizado para esta operación operativa" });
        }
        next();
    };
};

// Rutas principales
router.route('/')
    .get(vueloController.obtenerVuelos) // Listado con filtros de unidad
    .post(vueloController.registrarVuelo); // Carga de vuelo e impacto en legajos

router.route('/:id')
    .delete(authorize('admin'), vueloController.eliminarVuelo); // Solo admin borra vuelos por seguridad

module.exports = router;