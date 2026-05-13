const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN - SINCRO JOKER v3.1
 * Corregido para detectar 'rol' o 'role' y evitar bloqueos.
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // DETECCIÓN DINÁMICA: Buscamos en rol (ES) o role (EN)
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        // Si no hay rol o no está en la lista, denegamos
        if (!userRole || !permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no tiene permisos para esta gestión.` 
            });
        }
        next();
    };
};

// GRUPOS DE ACCESO (Mantenemos tu lógica de gestión militar)
const rolesGestion = ['admin', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE'];
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];
const rolesBaja = ['admin', 'OPERACIONES', 'JEFE'];

// PROTECCIÓN GLOBAL
router.use(protect);

/**
 * 1. RUTAS BASE: /api/tripulantes
 */
router.route('/')
    .get(authorize(...rolesConsulta), tripulanteController.obtenerTripulantes)
    .post(authorize(...rolesGestion), tripulanteController.crearTripulante); 

/**
 * 2. GESTIÓN DE HABILITACIONES
 */
router.post('/:id/habilitacion', 
    authorize(...rolesGestion), 
    tripulanteController.gestionarHabilitacion
);

/**
 * 3. BÚSQUEDA Y GESTIÓN INDIVIDUAL
 */
router.get('/buscar/:termino', 
    authorize(...rolesConsulta), 
    tripulanteController.buscarTripulante
);

router.route('/:id')
    .put(authorize(...rolesGestion), tripulanteController.actualizarTripulante) 
    .delete(authorize(...rolesBaja), tripulanteController.eliminarTripulante); 

/**
 * 4. CAPACITACIONES ESPECIALES
 */
router.post('/:id/capacitacion', 
    authorize(...rolesGestion), 
    tripulanteController.agregarCapacitacion
);

module.exports = router;