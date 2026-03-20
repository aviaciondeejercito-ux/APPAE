const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * IMPORTACIÓN DE SEGURIDAD JERÁRQUICA AE
 * 'protect' verifica la identidad (Token).
 * 'authorize' verifica el nivel de comando (Rol).
 */
const { authorize } = require('../middleware/rolecheck');
const protect = authMiddleware.protect || authMiddleware.verifyToken;

/**
 * CAPA DE SEGURIDAD GLOBAL
 * El orden es vital: Primero autentica el Token, luego verifica el Rol.
 */
if (typeof protect === 'function') {
    router.use(protect);
} else {
    console.error("❌ CRÍTICO: No se encontró la función de protección de rutas.");
}

/**
 * CONFIGURACIÓN DE ACCESOS SEGÚN MATRIZ DE PERMISOS:
 * - ADMIN: Acceso total a todas las funciones.
 * - BOSS: Monitor Full y Gestión de Personal/Aeronaves.
 * - S4_UNIDAD / S4: Gestión de Material y Personal de su elemento.
 */

// --- ENDPOINTS DE GESTIÓN DE PERSONAL Y MATERIAL ---

// @route   GET /api/admin/users
// @desc    Obtener lista de personal y aeronaves (Escalafón)
// Permiso: BOSS, S4 y ADMIN.
router.get('/users', authorize('admin', 'boss', 's4', 'S4_UNIDAD'), adminController.getAllUsers);

// @route   PUT /api/admin/users/:id/role
// @desc    Actualizar jerarquía/permisos
// Permiso: Solo ADMIN y BOSS (Para mantener la cadena de mando).
router.put('/users/:id/role', authorize('admin', 'boss'), adminController.updateRole);

// @route   PUT /api/admin/users/:id/password
// @desc    Reseteo de contraseña (GDE)
// Permiso: ADMIN, BOSS y S4 (Para facilitar la operatividad en la unidad).
router.put('/users/:id/password', authorize('admin', 'boss', 's4', 'S4_UNIDAD'), adminController.resetPassword);

// @route   DELETE /api/admin/users/:id
// @desc    Baja definitiva del sistema
// Permiso: EXCLUSIVO ADMIN (Seguridad máxima en eliminaciones).
router.delete('/users/:id', authorize('admin'), adminController.deleteUser);

module.exports = router;