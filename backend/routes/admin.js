const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * CONFIGURACIÓN DE MIDDLEWARES
 * Buscamos 'protect' o 'verifyToken' para asegurar compatibilidad.
 */
const protect = authMiddleware.protect || authMiddleware.verifyToken;

/**
 * MIDDLEWARE DE AUTORIZACIÓN OPERATIVA (ESTÁNDAR DE SEGURIDAD AE)
 * Permite el acceso a Administradores y Personal S4 de Unidad.
 */
const isAuthorized = (req, res, next) => {
    const authorizedRoles = ['admin', 'S4_UNIDAD', 'boss'];
    
    if (req.user && authorizedRoles.includes(req.user.role)) {
        next();
    } else {
        console.warn(`[SEGURIDAD] Intento de acceso no autorizado: ${req.user ? req.user.username : 'Desconocido'}`);
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado: Su rol no tiene permisos para esta operación.' 
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
    console.error("❌ CRÍTICO: No se encontró la función de protección de rutas.");
}

// Aplicamos el nuevo middleware de autorización híbrida
router.use(isAuthorized);

// --- ENDPOINTS DE GESTIÓN DE PERSONAL Y MATERIAL ---

/**
 * NOTA DE SEGURIDAD: 
 * Aunque el S4 puede entrar, las funciones sensibles de base de datos 
 * están protegidas por la lógica del controlador.
 */

// Obtener el escalafón o lista de aeronaves
router.get('/users', adminController.getAllUsers);

// Actualizar jerarquía/permisos (Habilitado para gestión de S4 y Superiores)
router.put('/users/:id/role', adminController.updateRole);

// Reseteo de contraseña (GDE)
router.put('/users/:id/password', adminController.resetPassword);

// Baja definitiva del sistema
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;