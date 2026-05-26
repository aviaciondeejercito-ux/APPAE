const express = require('express');
const router = express.Router();
const vueloController = require('../controllers/vueloController');
const { protect } = require('../middleware/authMiddleware');

/**
 * RUTAS DE GESTIÓN DE VUELOS - SISTEMA GESTIÓN AE
 * Acceso: admin y OPERACIONES tienen control total. 
 * Otros roles (user, JEFE, etc.) tienen acceso según la lógica del controlador.
 */

// 1. Protección Global: Requiere Token
router.use(protect);

// 2. Middleware de Autorización por Rol (Blindado SINCRO JOKER)
const authorize = (...roles) => {
    return (req, res, next) => {
        // Buscamos dinámicamente en 'rol' o 'role' y normalizamos (Ej: "Oficina_Tecnica" o "OFICINA-TECNICA" -> "OFICINATECNICA")
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        // Normalizamos los roles permitidos en la ruta
        const rolesPermitidos = roles.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!rolesPermitidos.includes(userRole)) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El rol [${rawRole || 'SIN ROL'}] no tiene permisos para la gestión de vuelos.` 
            });
        }
        next();
    };
};

/**
 * 3. Definición de Endpoints
 */
// LISTA DE ROLES CON ACCESO OPERATIVO A VUELOS (Se integra JEFE para visualización y carga básica de unidad)
const rolesConAcceso = ['admin', 'user', 'OPERACIONES', 'JEFE'];

router.route('/')
    .get(authorize(...rolesConAcceso), vueloController.obtenerVuelos) 
    .post(authorize(...rolesConAcceso), vueloController.registrarVuelo); 

router.route('/:id')
    // El borrado es crítico por el impacto inverso en el cómputo de horas de los legajos
    .delete(authorize('admin', 'OPERACIONES', 'JEFE'), vueloController.eliminarVuelo); 

module.exports = router;