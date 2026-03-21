/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Restringe el acceso a rutas específicas y valida propiedad de recursos.
 * @param {...string} rolesPermitidos - Lista de roles autorizados (ej: 'admin', 'boss', 'user')
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
        const userRole = req.user.role.toUpperCase();
        const allowedRoles = rolesPermitidos.map(r => r.toUpperCase());

        // Comprobamos si el rol actual del usuario está dentro de la matriz de permisos permitidos
        if (!allowedRoles.includes(userRole)) {
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.username || 'N/A'} (Rol: ${userRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado: El nivel jerárquico '${userRole}' no posee permisos para esta acción específica.` 
            });
        }

        /**
         * 3. LÓGICA DE MANDO (ADD-ON BOSS/ADMIN)
         * Si el usuario es BOSS o ADMIN, inyectamos una propiedad en 'req' 
         * para que los controladores sepan que tiene "Poder Total" de edición
         * sobre cualquier unidad/elemento.
         */
        req.isMando = (userRole === 'ADMIN' || userRole === 'BOSS');

        // Registro de Auditoría interna de accesos exitosos.
        console.log(`[AUTORIZADO] Acceso concedido a ${req.user.username || 'Sistema'} (Rol: ${userRole}) ${req.isMando ? '[MODO MANDO ACTIVO]' : ''}`);
        
        next(); 
    };
};

/**
 * EXPORTACIÓN DE SEGURIDAD
 * Este módulo es el guardián de la jerarquía de mandos en las rutas del backend.
 */
module.exports = { authorize };