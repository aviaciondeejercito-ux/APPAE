/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Restringe el acceso a rutas específicas según el rol del usuario.
 * @param {...string} rolesPermitidos - Lista de roles autorizados (ej: 'admin', 'S4_UNIDAD')
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificación de Identidad (Inyectado previamente por authMiddleware)
        if (!req.user) {
            console.error('[SEGURIDAD] Intento de autorización sin usuario identificado.');
            return res.status(401).json({ 
                success: false,
                message: 'No autorizado: Usuario no identificado por el sistema' 
            });
        }

        // 2. Verificación de Permisos por Rol
        // Comprobamos si el rol actual (ej: 'S4_UNIDAD') está en la lista de permitidos para esta ruta
        if (!rolesPermitidos.includes(req.user.role)) {
            console.warn(`[BLOQUEO] Acceso Denegado: Usuario ${req.user.username} (Rol: ${req.user.role}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado: El nivel '${req.user.role}' no posee permisos de escritura/modificación para esta acción.` 
            });
        }

        // 3. Validación de Integridad AE
        // El usuario cumple con el rol, se le permite continuar al controlador
        next(); 
    };
};

/**
 * EXPORTACIÓN DE SEGURIDAD
 */
module.exports = { authorize };