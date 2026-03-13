const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

/**
 * MIDDLEWARE DE AUTORIZACIÓN DE ROL
 * Solo permite pasar si el usuario es 'admin'
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de Administrador' });
    }
};

// Todas las rutas de administración requieren estar logueado Y ser admin
router.use(protect, isAdmin);

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateRole);
router.put('/users/:id/password', adminController.resetPassword);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;