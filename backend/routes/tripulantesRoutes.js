const express = require('express');
const router = express.Router();
const tripulanteController = require('../controllers/tripulanteController');
const { protect } = require('../middleware/authMiddleware'); 
const Tripulante = require('../models/Tripulante');

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

const verificarJurisdiccionTripulante = async (req, res, next) => {
    try {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');

        if (['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(userRole)) {
            return next();
        }

        const tripulante = await Tripulante.findById(req.params.id);
        if (!tripulante || tripulante.activo === false) {
            return res.status(404).json({ success: false, message: "Tripulante no encontrado o inactivo." });
        }

        const unidadUsuario = (req.user.unidad || req.user.elemento || '').trim().toUpperCase();
        const unidadTripulante = (tripulante.unidad || tripulante.elemento || '').trim().toUpperCase();

        if (unidadUsuario !== unidadTripulante) {
            return res.status(403).json({ 
                success: false, 
                message: `ACCESO DENEGADO: Tu perfil asignado a [${unidadUsuario}] no tiene jurisdicción sobre [${unidadTripulante}].` 
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error al verificar la jurisdicción del tripulante.", error: error.message });
    }
};

const rolesGestion = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE'];
const rolesConsulta = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'USER', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];
const rolesBaja = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OPERACIONES', 'JEFE'];

// MAPPING SEGURO DE HANDLERS PARA EVITAR CAÍDAS (404 / 500) SI FALTA ALGUNA FUNCIÓN EN EL CONTROLLER
const getHandler = (fnName) => {
    if (typeof tripulanteController[fnName] === 'function') {
        return tripulanteController[fnName];
    }
    return (req, res) => {
        res.status(501).json({
            success: false,
            message: `La funcionalidad [${fnName}] no está implementada aún en tripulanteController.`
        });
    };
};

router.use(protect);

// 1. RUTAS BASE
router.route('/')
    .get(authorize(...rolesConsulta), getHandler('obtenerTripulantes'))
    .post(authorize(...rolesGestion), getHandler('crearTripulante')); 

// 2. BÚSQUEDA Y DETALLE INDIVIDUAL
router.get('/buscar/:termino', authorize(...rolesConsulta), getHandler('buscarTripulante'));

router.route('/:id')
    .get(authorize(...rolesConsulta), getHandler('obtenerTripulantePorId'))
    .put(authorize(...rolesGestion), verificarJurisdiccionTripulante, getHandler('actualizarTripulante')) 
    .delete(authorize(...rolesBaja), verificarJurisdiccionTripulante, getHandler('eliminarTripulante')); 

// 3. SUBDOCUMENTOS Y REGISTROS HISTÓRICOS
router.post('/:id/habilitacion', authorize(...rolesGestion), verificarJurisdiccionTripulante, getHandler('gestionarHabilitacion'));
router.post('/:id/capacitacion', authorize(...rolesGestion), verificarJurisdiccionTripulante, getHandler('agregarCapacitacion'));
router.post('/:id/aptitudes', authorize(...rolesGestion), verificarJurisdiccionTripulante, getHandler('agregarAptitudAdicional'));

module.exports = router;