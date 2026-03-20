/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Restringe el acceso a rutas específicas según el rol del usuario.
 * @param {...string} rolesPermitidos - Lista de roles autorizados (ej: 'admin', 'boss', 'S4_UNIDAD', 'user')
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificación de Identidad (Inyectado previamente por authMiddleware)
        // CRÍTICO: El objeto req.user debe existir tras pasar por el middleware de autenticación.
        if (!req.user || !req.user.role) {
            console.error('[SEGURIDAD] Intento de autorización sin usuario identificado o sin rol asignado.');
            return res.status(401).json({ 
                success: false,
                message: 'No autorizado: Usuario no identificado por el sistema o sesión inválida' 
            });
        }

        // 2. Normalización y Verificación de Permisos por Rol
        // Convertimos todo a Mayúsculas para evitar errores de tipeo en las rutas y base de datos (S4 vs s4)
        // Esto garantiza que 'S4_UNIDAD', 's4_unidad' o 'S4' sean procesados bajo el mismo estándar.
        const userRole = req.user.role.toUpperCase();
        const allowedRoles = rolesPermitidos.map(r => r.toUpperCase());

        // Comprobamos si el rol actual del usuario está dentro de la matriz de permisos permitidos
        if (!allowedRoles.includes(userRole)) {
            // REGISTRO DE SEGURIDAD: Auditoría interna de accesos denegados.
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.username || 'N/A'} (Rol: ${userRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado: El nivel jerárquico '${userRole}' no posee permisos para esta acción específica.` 
            });
        }

        // 3. Validación de Integridad AE exitosa
        // Se concede el paso al siguiente controlador si el rol es válido.
        console.log(`[AUTORIZADO] Acceso concedido a ${req.user.username || 'Sistema'} (Rol: ${userRole})`);
        next(); 
    };
};

/**
 * EXPORTACIÓN DE SEGURIDAD
 * Este módulo es el guardián de la jerarquía de mandos en las rutas del backend.
 */
module.exports = { authorize };