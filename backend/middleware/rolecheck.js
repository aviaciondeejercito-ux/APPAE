/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Restringe el acceso a rutas específicas según el rol del usuario.
 * @param {...string} rolesPermitidos - Lista de roles autorizados (ej: 'admin', 'boss', 'S4', 'user')
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificación de Identidad (Inyectado previamente por authMiddleware)
        if (!req.user || !req.user.role) {
            console.error('[SEGURIDAD] Intento de autorización sin usuario identificado o sin rol asignado.');
            return res.status(401).json({ 
                success: false,
                message: 'No autorizado: Usuario no identificado por el sistema o sesión inválida' 
            });
        }

        // 2. Normalización y Verificación de Permisos por Rol
        // Convertimos todo a Mayúsculas para evitar errores de tipeo en las rutas (S4 vs s4)
        const userRole = req.user.role.toUpperCase();
        const allowedRoles = rolesPermitidos.map(r => r.toUpperCase());

        // Comprobamos si el rol actual está en la lista de permitidos
        if (!allowedRoles.includes(userRole)) {
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.userName || 'N/A'} (Rol: ${userRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado: El nivel jerárquico '${userRole}' no posee permisos para esta acción específica.` 
            });
        }

        // 3. Validación de Integridad AE exitosa
        // El registro de auditoría interna permite trazabilidad de quién accedió a qué
        console.log(`[AUTORIZADO] Acceso concedido a ${req.user.userName} (Rol: ${userRole})`);
        next(); 
    };
};

/**
 * EXPORTACIÓN DE SEGURIDAD
 */
module.exports = { authorize };