const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');
const { protect } = require('../middleware/authMiddleware'); 
const Tripulante = require('../models/Tripulante'); // Requerido para verificar pertenencia

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN - SINCRO JOKER v3.6
 * Corregido para detectar 'rol' o 'role' y evitar bloqueos.
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!userRole || !permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no tiene permisos para esta gestión.` 
            });
        }
        next();
    };
};

/**
 * MIDDLEWARE DE CONTROL DE FRONTERA DE UNIDAD (ESTÁNDAR v3.6)
 * Evita que un gestor operativo o jefe altere o elimine personal de otra unidad.
 */
const verificarJurisdiccionTripulante = async (req, res, next) => {
    try {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        // El Administrador Global tiene acceso irrestricto a todo el personal
        if (userRole === 'ADMIN') {
            return next();
        }

        // Buscamos al tripulante en la base de datos antes de permitir la mutación
        const tripulante = await Tripulante.findById(req.params.id);
        if (!tripulante) {
            return res.status(404).json({ success: false, message: "Tripulante no encontrado." });
        }

        // Normalizamos las unidades para la comparación
        const unidadUsuario = (req.user.unidad || req.user.elemento || '').trim().toUpperCase();
        const unidadTripulante = (tripulante.unidad || tripulante.elemento || '').trim().toUpperCase();

        // Control estricto de frontera
        if (unidadUsuario !== unidadTripulante) {
            return res.status(403).json({ 
                success: false, 
                message: `ACCESO DENEGADO: Tu perfil asignado a [${unidadUsuario}] no tiene jurisdicción sobre el legajo de este tripulante perteneciente a [${unidadTripulante}].` 
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error al verificar la jurisdicción del tripulante.", error: error.message });
    }
};

// GRUPOS DE ACCESO
const rolesGestion = ['admin', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE'];
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];
const rolesBaja = ['admin', 'OPERACIONES', 'JEFE'];

// PROTECCIÓN GLOBAL: Requiere estar autenticado
router.use(protect);

/**
 * 1. RUTAS BASE: /api/tripulantes
 */
router.route('/')
    .get(authorize(...rolesConsulta), tripulanteController.obtenerTripulantes)
    .post(authorize(...rolesGestion), tripulanteController.crearTripulante); 

/**
 * 2. GESTIÓN DE HABILITACIONES INTERNAS (SdA / ROL)
 */
router.post('/:id/habilitacion', 
    authorize(...rolesGestion), 
    verificarJurisdiccionTripulante, // Protegido contra saltos de unidad
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
    .put(authorize(...rolesGestion), verificarJurisdiccionTripulante, tripulanteController.actualizarTripulante) 
    .delete(authorize(...rolesBaja), verificarJurisdiccionTripulante, tripulanteController.eliminarTripulante); 

/**
 * 4. CAPACITACIONES ESPECIALES (Misiones / NVG)
 */
router.post('/:id/capacitacion', 
    authorize(...rolesGestion), 
    verificarJurisdiccionTripulante, // Protegido contra saltos de unidad
    tripulanteController.agregarCapacitacion
);

module.exports = router;