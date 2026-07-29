const express = require('express');
const router = express.Router();
const vueloController = require('../controllers/vueloController');
const { protect } = require('../middleware/authMiddleware');
const Vuelo = require('../models/Vuelo'); // Importamos para la validación de frontera

/**
 * RUTAS DE GESTIÓN DE VUELOS - SISTEMA GESTIÓN AE
 * Acceso: admin, OPERACIONES, JEFE, BOSS, DIRECTOR, OTO y OFICINATECNICA.
 */

// 1. Protección Global: Requiere Token
router.use(protect);

// 2. Middleware de Autorización por Rol (Blindado SINCRO JOKER)
const authorize = (...roles) => {
    return (req, res, next) => {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const rolesPermitidos = roles.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!rolesPermitidos.includes(userRole)) {
            return res.status(403).json({ 
                mensaje: `ACCESO DENEGADO: El rol [${rawRole || 'SIN ROL'}] no tiene permisos para esta operación de vuelos.` 
            });
        }
        next();
    };
};

// 3. Middleware de Control de Frontera/Unidad para Eliminación Crítica
const verificarJurisdiccionBaja = async (req, res, next) => {
    try {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        // Si es administrador global o el encargado central de operaciones, tiene libre albedrío
        if (userRole === 'ADMIN' || userRole === 'OPERACIONES') {
            return next();
        }

        // Si es JEFE o USER, verificamos que el vuelo pertenezca estrictamente a su misma unidad corporativa/militar
        const vuelo = await Vuelo.findById(req.params.id);
        if (!vuelo) {
            return res.status(404).json({ mensaje: "Vuelo no encontrado para verificar jurisdicción" });
        }

        const unidadUsuario = (req.user.unidad || req.user.elemento || '').trim().toUpperCase();
        const unidadVuelo = (vuelo.unidadResponsable || '').trim().toUpperCase();

        if (unidadUsuario !== unidadVuelo) {
            return res.status(403).json({ 
                mensaje: `ACCESO ACCIÓN CRÍTICA DENEGADO: No podés eliminar un vuelo perteneciente a la unidad [${unidadVuelo}] desde tu perfil asignado a [${unidadUsuario}].` 
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({ mensaje: "Error interno al verificar la jurisdicción del registro", error: error.message });
    }
};

/**
 * 4. Definición de Endpoints
 * Se amplían los roles permitidos para garantizar la lectura de datos desde el Dashboard de Vuelos.
 */
const rolesConAcceso = ['ADMIN', 'USER', 'OPERACIONES', 'JEFE', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINATECNICA'];

router.route('/')
    .get(authorize(...rolesConAcceso), vueloController.obtenerVuelos) 
    .post(authorize(...rolesConAcceso), vueloController.registrarVuelo); 

router.route('/:id')
    // Eliminación restringida únicamente a Administradores, Operaciones y Jefes
    .delete(authorize('ADMIN', 'OPERACIONES', 'JEFE'), verificarJurisdiccionBaja, vueloController.eliminarVuelo); 

module.exports = router;