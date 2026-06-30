const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware'); 

// Middleware de autorización - Sincro JOKER v3.6 (Mantenido intacto)
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        const rawRole = req.user?.rol || req.user?.role || '';
        const userRole = String(rawRole).toUpperCase().replace(/[\s_-]/g, '');
        const permitidosLimpios = rolesPermitidos.map(r => r.toUpperCase().replace(/[\s_-]/g, ''));
        
        if (!userRole || !permitidosLimpios.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                mensaje: `Acceso denegado: El nivel [${rawRole || 'SIN ROL'}] no tiene permisos.` 
            });
        }
        next();
    };
};

const rolesConsulta = ['admin', 'BOSS', 'DIRECTOR', 'OTO', 'user', 'OFICINA_TECNICA', 'OPERACIONES', 'JEFE', 'LOGISTICO', 'PERSONAL'];
const rolesEscritura = ['admin', 'OPERACIONES', 'JEFE', 'PERSONAL', 'OFICINA_TECNICA', 'OTO'];

// Protección global de sesión activa para todo el submódulo
router.use(protect);

// --- RUTAS AJUSTADAS EXCLUSIVAMENTE PARA EL DESPLIEGUE ---

// 1. GET /api/ebm -> Mapea directo a la nómina consolidada por SdA
router.get('/', authorize(...rolesConsulta), ebmController.getPlanificacionCompleta);

// 2. GET /api/ebm/vuelos/:id -> Historial de vuelos individuales (Sustituye la línea del error sin perder la funcionalidad)
router.get('/vuelos/:id', authorize(...rolesConsulta), ebmController.getVuelosTripulanteEbm);

// 3. PUT /api/ebm/:id -> Persistencia y guardado anual de los 4 trimestres por SdA
router.put('/:id', authorize(...rolesEscritura), ebmController.actualizarConfiguracionEbm);

module.exports = router;