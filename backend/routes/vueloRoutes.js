const express = require('express');
const router = express.Router();
const vueloController = require('../controllers/vueloController');
const { protect } = require('../middleware/authMiddleware');

/**
 * RUTAS DE GESTIÓN DE VUELOS - SISTEMA GESTIÓN AE
 * Configuración híbrida: Acceso para Admin y User (Operadores de Unidad).
 */

// 1. Protección Global: Requiere Token para cualquier operación
router.use(protect);

// 2. Middleware de Autorización por Rol
const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user.role?.toLowerCase();
        const rolesPermitidos = roles.map(r => r.toLowerCase());
        
        if (!rolesPermitidos.includes(userRole)) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El rol ${req.user.role} no tiene permisos para este módulo.` 
            });
        }
        next();
    };
};

// 3. Definición de Endpoints
// Permitimos que tanto 'admin' como 'user' puedan listar y cargar vuelos.
// La lógica de qué ve cada uno (su unidad vs todo) ya está resuelta en el controlador.

router.route('/')
    .get(authorize('admin', 'user'), vueloController.obtenerVuelos) 
    .post(authorize('admin', 'user'), vueloController.registrarVuelo); 

router.route('/:id')
    // El borrado lo mantenemos exclusivo de Admin por seguridad operativa (impacto en legajos)
    .delete(authorize('admin'), vueloController.eliminarVuelo); 

module.exports = router;