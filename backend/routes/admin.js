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

// Verificación de compatibilidad de nombres en el middleware de autenticación
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

// --- SECCIÓN: ESTADÍSTICAS ESTRATÉGICAS ---

// @route   GET /api/admin/stats
// @desc    Obtener métricas de disponibilidad y operatividad
// @access  RESTRINGIDO: Solo ADMIN y BOSS (User y S4 bloqueados)
// SOLUCIÓN: Cambiado 'getStats' por 'getAdminStats' para coincidir con el controlador.
router.get('/stats', authorize('admin', 'boss'), adminController.getAdminStats);


// --- SECCIÓN: GESTIÓN DE PERSONAL Y MATERIAL ---

// @route   GET /api/admin/users
// @desc    Obtener lista de personal (Escalafón)
// Permiso: BOSS, S4_UNIDAD y ADMIN.
router.get('/users', authorize('admin', 'boss', 's4', 'S4_UNIDAD'), adminController.getAllUsers);

// @route   PUT /api/admin/users/:id/role
// @desc    Actualizar jerarquía/permisos
// Permiso: Solo ADMIN y BOSS (Para mantener la cadena de mando).
router.put('/users/:id/role', authorize('admin', 'boss'), adminController.updateRole);

// @route   PUT /api/admin/users/:id/password
// @desc    Reseteo de contraseña (GDE)
// Permiso: ADMIN, BOSS y S4_UNIDAD.
router.put('/users/:id/password', authorize('admin', 'boss', 's4', 'S4_UNIDAD'), adminController.resetPassword);

// @route   DELETE /api/admin/users/:id
// @desc    Baja definitiva del sistema
// Permiso: EXCLUSIVO ADMIN (Seguridad máxima en eliminaciones por integridad de datos).
router.delete('/users/:id', authorize('admin'), adminController.deleteUser);

module.exports = router;