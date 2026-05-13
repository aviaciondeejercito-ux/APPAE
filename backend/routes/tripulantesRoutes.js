const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * MIDDLEWARE INTERNO DE AUTORIZACIÓN - SINCRO JOKER
 * Normaliza los roles para evitar errores por guiones bajos o espacios.
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Normalizamos el rol del usuario que viene del Token
        const userRole = req.user?.role?.toUpperCase().replace(/[\s_-]/g, '') || '';
        
        // Normalizamos la lista de roles permitidos para la comparación
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel ${req.user?.role} no tiene permisos para esta gestión de personal.` 
            });
        }
        next();
    };
};

// --- GRUPOS DE ACCESO ACTUALIZADOS ---
// Basado en la estructura de gestión de personal y operaciones militares

// Roles con capacidad de gestión (Alta, Modificación, Carga de Cursos)
const rolesGestion = ['admin', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE'];

// Roles con capacidad de consulta (Lectura de legajos)
const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];

// Roles con capacidad de dar la Baja (Eliminación)
const rolesBaja = ['admin', 'OPERACIONES', 'JEFE'];

// --- PROTECCIÓN GLOBAL ---
// Todas las rutas requieren token válido
router.use(protect);

/**
 * 1. RUTAS BASE: /api/tripulantes
 * Gestión del listado general y creación de nuevos legajos.
 */
router.route('/')
    .get(authorize(...rolesConsulta), tripulanteController.obtenerTripulantes)
    .post(authorize(...rolesGestion), tripulanteController.crearTripulante); 

/**
 * 2. GESTIÓN DE APTITUDES Y CALIFICACIONES
 * Carga de horas por sistema (Aeronave) y actualización de habilitaciones.
 */
router.post('/:id/habilitacion', 
    authorize(...rolesGestion), 
    tripulanteController.gestionarHabilitacion
);

/**
 * 3. BÚSQUEDA Y GESTIÓN INDIVIDUAL
 * Acceso por ID o término de búsqueda (Apellido/Grado).
 */
router.get('/buscar/:termino', 
    authorize(...rolesConsulta), 
    tripulanteController.buscarTripulante
);

router.route('/:id')
    .put(authorize(...rolesGestion), tripulanteController.actualizarTripulante) 
    // Ahora permite que Operaciones y Jefe ejecuten la eliminación
    .delete(authorize(...rolesBaja), tripulanteController.eliminarTripulante); 

/**
 * 4. CAPACITACIONES ESPECIALES
 * Registro de cursos, NVG y certificaciones adicionales.
 */
router.post('/:id/capacitacion', 
    authorize(...rolesGestion), 
    tripulanteController.agregarCapacitacion
);

module.exports = router;