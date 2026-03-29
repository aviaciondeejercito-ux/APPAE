/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Restringe el acceso a rutas específicas y valida propiedad de recursos.
 * Actualización: Integración de nuevos niveles (Director, OTO, OTOAE, Oficina Técnica).
 * @param {...string} rolesPermitidos - Lista de roles autorizados
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
        // Obtenemos el rol tal cual viene de la DB (Ej: "OFICINA_TECNICA")
        const normalizedUserRole = String(req.user.role).toUpperCase().trim();

        // Normalizamos los roles permitidos de la misma manera
        const allowedRoles = rolesPermitidos.map(r => 
            String(r).toUpperCase().trim()
        );

        // COMPROBACIÓN CRUZADA (SINCRO JOKER):
        // Comparamos el rol del usuario contra todas las variantes posibles (espacio y guion bajo)
        const hasPermission = allowedRoles.some(role => {
            const roleWithUnderscore = role.replace(/\s+/g, '_');
            const roleWithSpace = role.replace(/_/g, ' ');
            
            return normalizedUserRole === role || 
                   normalizedUserRole === roleWithUnderscore || 
                   normalizedUserRole === roleWithSpace;
        });

        if (!hasPermission) {
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.username || 'N/A'} (Rol: ${normalizedUserRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel jerárquico '${normalizedUserRole}' no posee permisos para esta acción específica.` 
            });
        }

        /**
         * 3. LÓGICA DE MANDO (ADMIN / BOSS / DIRECTOR / OTO / OTOAE)
         * Se incluye OTO y OTOAE en isMando para que hereden la visión global de todas las unidades.
         */
        const mandoRoles = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'];
        req.isMando = mandoRoles.some(role => {
            const rUnderscore = role.replace(/\s+/g, '_');
            const rSpace = role.replace(/_/g, ' ');
            return normalizedUserRole === role || normalizedUserRole === rUnderscore || normalizedUserRole === rSpace;
        });

        /**
         * 4. COMPROBACIÓN DE GESTIÓN TÉCNICA Y OPERATIVA (OFICINA TECNICA / USER / S4 UNIDAD)
         * Inyectamos flags para facilitar la lógica de carga y mantenimiento por unidad.
         */
        const checkRole = (roleName) => {
            const rName = roleName.toUpperCase();
            const rUnderscore = rName.replace(/\s+/g, '_');
            const rSpace = rName.replace(/_/g, ' ');
            return normalizedUserRole === rName || normalizedUserRole === rUnderscore || normalizedUserRole === rSpace;
        };

        req.isGestionUnidad = (checkRole('OFICINA TECNICA') || checkRole('USER') || checkRole('S4 UNIDAD') || checkRole('S4_UNIDAD'));
        
        // Flag específico para Oficina Técnica
        req.isOficinaTecnica = checkRole('OFICINA TECNICA');

        // Registro de Auditoría interna de accesos exitosos.
        console.log(`[AUTORIZADO] Acceso concedido a ${req.user.username || 'Sistema'} (Rol: ${normalizedUserRole}) ${req.isMando ? '[MODO MANDO ACTIVO]' : ''}`);
        
        next(); 
    };
};

/**
 * EXPORTACIÓN DE SEGURIDAD
 * Este módulo es el guardián de la jerarquía de mandos en las rutas del backend.
 */
module.exports = { authorize };