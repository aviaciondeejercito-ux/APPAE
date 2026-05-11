/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Guardian de la jerarquía SINCRO JOKER.
 * @param {...string} rolesPermitidos - Lista de roles autorizados
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificación de Identidad
        const userRole = req.user?.role || req.user?.user?.role;

        if (!req.user || !userRole) {
            console.error('[SEGURIDAD] Intento de acceso sin rol identificado.');
            return res.status(401).json({ 
                success: false, 
                message: 'No autorizado: Sesión inválida o rol no asignado' 
            });
        }

        // 2. Normalización Estricta (Sincro Joker)
        // Eliminamos guiones bajos y espacios para la comparación lógica de flags
        const normalizedUserRole = String(userRole).toUpperCase().trim();
        const roleSinFormato = normalizedUserRole.replace(/[\s_]/g, '');
        
        const allowedRoles = rolesPermitidos.map(r => String(r).toUpperCase().trim());

        // 3. Comprobación de Permisos (Búsqueda Exacta)
        const hasPermission = allowedRoles.includes(normalizedUserRole);

        if (!hasPermission) {
            console.warn(`[BLOQUEO] Acceso Denegado: ${req.user.username} (Rol: ${normalizedUserRole})`);
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel '${normalizedUserRole}' no tiene permisos aquí.` 
            });
        }

        /**
         * 4. LÓGICA DE MANDO GLOBAL (Flags de Inyección)
         * Roles con visión total del sistema.
         */
        const mandoRoles = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'];
        req.isMando = mandoRoles.includes(normalizedUserRole);

        /**
         * 5. COMPROBACIÓN DE GESTIÓN OPERATIVA Y TÉCNICA
         * Seteamos quién puede "tocar" datos en los controladores.
         */
        
        // Gestión Técnica (Aeronaves/Material)
        req.isOficinaTecnica = (roleSinFormato === 'OFICINATECNICA');

        // Gestión de Personal/Vuelos (Nuevos Roles)
        const esGestorOperativo = ['OPERACIONES', 'JEFE'].includes(normalizedUserRole);
        
        // Flag General de Gestión (Para controladores de eventos/vuelos)
        req.isGestionUnidad = (
            req.isMando || 
            req.isOficinaTecnica || 
            esGestorOperativo || 
            normalizedUserRole === 'USER' ||
            normalizedUserRole === 'LOGISTICO' ||
            normalizedUserRole === 'PERSONAL'
        );

        console.log(`[AUTORIZADO] ${req.user.username} (${normalizedUserRole}) ${req.isMando ? '[MANDO]' : ''}`);
        
        next(); 
    };
};

module.exports = { authorize };