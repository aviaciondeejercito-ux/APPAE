const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * CONFIGURACIÓN DE MIDDLEWARES
 * Buscamos 'protect' o 'verifyToken' para asegurar compatibilidad.
 */
const protect = authMiddleware.protect || authMiddleware.verifyToken;

// Middleware interno para validar Rango Mando (Admin)
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`[SEGURIDAD] Intento de acceso no autorizado: ${req.user ? req.user.username : 'Desconocido'}`);
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado: Se requieren privilegios de Administrador' 
        });
    }
};

/**
 * CAPA DE SEGURIDAD GLOBAL
 * El orden es vital: Primero autentica el Token, luego verifica el Rol.
 */
if (typeof protect === 'function') {
    router.use(protect);
} else {
    // Si llegamos aquí, hay un problema grave en authMiddleware.js
    console.error("❌ CRÍTICO: No se encontró la función de protección de rutas.");
}

router.use(isAdmin);

// --- ENDPOINTS DE GESTIÓN DE PERSONAL (100% Sincronizados con Controlador) ---

// Obtener el escalafón completo
router.get('/users', adminController.getAllUsers);

// Actualizar jerarquía/permisos (user, boss, admin)
router.put('/users/:id/role', adminController.updateRole);

// Reseteo de contraseña (GDE)
// NOTA: Coincide con adminController.resetPassword y la ruta /password
router.put('/users/:id/password', adminController.resetPassword);

// Baja definitiva del sistema
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;