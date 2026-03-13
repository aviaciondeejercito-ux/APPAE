const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

/**
 * MIDDLEWARE DE AUTORIZACIÓN DE ROL
 * Seguridad Crítica: Solo permite el paso si el usuario tiene rol 'admin'.
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`[SEGURIDAD] Intento de acceso denegado a Admin: ${req.user ? req.user.username : 'Anónimo'}`);
        res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado: Se requieren privilegios de Administrador' 
        });
    }
};

/**
 * CAPA DE PROTECCIÓN GLOBAL
 * Todas las rutas definidas a continuación requieren Token válido y Rol Admin.
 */
router.use(protect);
router.use(isAdmin);

// --- ENDPOINTS DE GESTIÓN DE PERSONAL ---

// Ruta: GET /api/admin/users
// Acción: Lista todo el personal registrado
router.get('/users', adminController.getAllUsers);

// Ruta: PUT /api/admin/users/:id/role
// Acción: Ascenso o cambio de permisos de usuario
router.put('/users/:id/role', adminController.updateRole);

// Ruta: PUT /api/admin/users/:id/password
// Acción: Reseteo de credenciales por el administrador
router.put('/users/:id/password', adminController.resetPassword);

// Ruta: DELETE /api/admin/users/:id
// Acción: Baja definitiva del sistema
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;