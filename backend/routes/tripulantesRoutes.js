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

router.use(protect);

// 1. RUTAS BASE
router.route('/')
    .get(authorize(...rolesConsulta), tripulanteController.obtenerTripulantes)
    .post(authorize(...rolesGestion), tripulanteController.crearTripulante); 

// 2. BUSQUEDA Y DETALLE INDIVIDUAL
router.get('/buscar/:termino', authorize(...rolesConsulta), tripulanteController.buscarTripulante);

router.route('/:id')
    .get(authorize(...rolesConsulta), tripulanteController.obtenerTripulantePorId) // 👈 RUTA AGREGADA (Evita 404)
    .put(authorize(...rolesGestion), verificarJurisdiccionTripulante, tripulanteController.actualizarTripulante) 
    .delete(authorize(...rolesBaja), verificarJurisdiccionTripulante, tripulanteController.eliminarTripulante); 

// 3. SUBDOCUMENTOS Y REGISTROS
router.post('/:id/habilitacion', authorize(...rolesGestion), verificarJurisdiccionTripulante, tripulanteController.gestionarHabilitacion);
router.post('/:id/capacitacion', authorize(...rolesGestion), verificarJurisdiccionTripulante, tripulanteController.agregarCapacitacion);
router.post('/:id/aptitudes', authorize(...rolesGestion), verificarJurisdiccionTripulante, tripulanteController.agregarAptitudAdicional);

module.exports = router;