const express = require('express');
const router = express.Router();
const ebmController = require('../controllers/ebmController');
const { protect } = require('../middleware/authMiddleware'); 

// Middleware de autorización
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

// Protección global
router.use(protect);

// RUTAS
// Nota: Verificamos que ebmController exista y tenga las funciones
router.get('/planificacion-completa', authorize(...rolesConsulta), ebmController.getPlanificacionCompleta);
router.get('/vuelos-unidad', authorize(...rolesConsulta), ebmController.getVuelosUnidad);
router.put('/actualizar-configuracion/:id', authorize(...rolesEscritura), ebmController.actualizarConfiguracionEbm);

module.exports = router;