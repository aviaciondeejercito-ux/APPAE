const express = require('express');
const router = express.Router();
// Verificación de ruta según estructura de carpetas detectada
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

/**
 * MIDDLEWARE DE AUTORIZACIÓN DE ROL
 * Seguridad Crítica: Solo permite el paso si el usuario tiene rol 'admin'.
 * Si el usuario es 'user' o 'boss', será rechazado con 403.
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`[SEGURIDAD] Acceso denegado: Usuario ${req.user ? req.user.username : 'Anónimo'} intentó entrar a Admin.`);
        res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado: Se requieren privilegios de Administrador' 
        });
    }
};

/**
 * CAPA DE PROTECCIÓN GLOBAL
 * Aplicamos los middlewares en orden: 
 * 1. Token válido (protect) 
 * 2. Jerarquía Admin (isAdmin)
 */
router.use(protect);
router.use(isAdmin);

// --- ENDPOINTS DE GESTIÓN DE PERSONAL ---

/**
 * @route   GET /api/admin/users
 * @desc    Lista todo el personal para la tabla de gestión
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Cambio de rango (user/admin/boss)
 */
router.put('/users/:id/role', adminController.updateRole);

/**
 * @route   PUT /api/admin/users/:id/password
 * @desc    Reseteo forzado de contraseña por mando
 */
router.put('/users/:id/password', adminController.resetPassword);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Baja definitiva del sistema
 */
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;