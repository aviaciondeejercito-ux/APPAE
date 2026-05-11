const express = require('express');
const router = express.Router();
const vueloController = require('../controllers/vueloController');
const { protect } = require('../middleware/authMiddleware');

/**
 * RUTAS DE GESTIÓN DE VUELOS - SISTEMA GESTIÓN AE
 * Estándar de seguridad: Solo personal autenticado.
 */

// 1. Protección Global: Nadie entra sin Token
router.use(protect);

// 2. Middleware de Autorización por Rol
const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user.role?.toLowerCase();
        // Normalizamos los roles para evitar errores de mayúsculas
        const rolesPermitidos = roles.map(r => r.toLowerCase());
        
        if (!rolesPermitidos.includes(userRole)) {
            return res.status(403).json({ 
                mensaje: `El rol ${req.user.role} no tiene permiso para ejecutar esta acción.` 
            });
        }
        next();
    };
};

// 3. Definición de Endpoints
// Nota: Verificamos que los nombres coincidan con el controlador (obtenerVuelos / registrarVuelo)
router.route('/')
    .get(vueloController.obtenerVuelos) 
    .post(vueloController.registrarVuelo); 

router.route('/:id')
    .delete(authorize('admin'), vueloController.eliminarVuelo); 

module.exports = router;