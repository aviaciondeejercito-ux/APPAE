const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware'); 

// Middleware de autorización - Sincro JOKER v3.6
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

// --- RUTAS AJUSTADAS PARA SINCRO FRONT-BACK ---

// GET /api/planificacion-ebm (O como esté montado en tu server.js/app.js)
// Si tu frontend llama a la ruta raíz del módulo, mapeamos ebmController aquí:
router.get('/', authorize(...rolesConsulta), ebmController.getPlanificacionCompleta);

// GET /api/planificacion-ebm/vuelos-unidad
router.get('/vuelos-unidad', authorize(...rolesConsulta), ebmController.getVuelosUnidad);

// PUT /api/planificacion-ebm/:id 
// Ajustado para que calce directo con API.put(`/planificacion-ebm/${pilotoId}`)
router.put('/:id', authorize(...rolesEscritura), ebmController.actualizarConfiguracionEbm);

module.exports = router;