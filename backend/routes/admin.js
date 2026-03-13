const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

/**
 * MIDDLEWARE DE AUTORIZACIÓN DE ROL
 * Verifica que el usuario autenticado tenga el rol de 'admin'.
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`⚠️ Intento de acceso no autorizado: Usuario ${req.user ? req.user.username : 'Desconocido'} intentó acceder a rutas de Admin.`);
        res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de Administrador' });
    }
};

// Aplicar protección y verificación de rol a todas las rutas de este archivo
router.use(protect);
router.use(isAdmin);

// --- DEFINICIÓN DE ENDPOINTS ---

// Obtener lista completa de personal
router.get('/users', adminController.getAllUsers);

// Modificar permisos/rol de un usuario específico
router.put('/users/:id/role', adminController.updateRole);

// Resetear contraseña de un usuario (Gestión de mandos)
router.put('/users/:id/password', adminController.resetPassword);

// Baja definitiva de usuario del sistema
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;