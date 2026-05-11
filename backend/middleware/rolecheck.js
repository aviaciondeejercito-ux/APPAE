/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Guardian de la jerarquía SINCRO JOKER.
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificación de Identidad (Búsqueda en req.user inyectado por protect)
        const userRole = req.user?.role || req.user?.user?.role;

        if (!req.user || !userRole) {
            console.error('[SEGURIDAD] Intento de acceso sin rol identificado.');
            return res.status(401).json({ 
                success: false, 
                message: 'No autorizado: Sesión inválida o rol no asignado' 
            });
        }

        // 2. Normalización Estricta SINCRO JOKER
        // Convertimos a MAYÚSCULAS y quitamos TODO (espacios, guiones, bajos) para la lógica interna
        const roleBase = String(userRole).toUpperCase().trim();
        const roleLimpio = roleBase.replace(/[\s_-]/g, ''); 
        
        // Normalizamos la lista de permitidos de la misma forma para que coincidan siempre
        const allowedRolesNormalized = rolesPermitidos.map(r => 
            String(r).toUpperCase().trim().replace(/[\s_-]/g, '')
        );

        // 3. Comprobación de Permisos
        const hasPermission = allowedRolesNormalized.includes(roleLimpio);

        if (!hasPermission) {
            console.warn(`[BLOQUEO] Acceso Denegado: ${req.user.username} (Rol: ${roleBase})`);
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel '${roleBase}' no tiene permisos para esta función.` 
            });
        }

        /**
         * 4. INYECCIÓN DE FLAGS TÁCTICAS (Para uso en controladores)
         * Usamos roleLimpio para que 'OFICINA_TECNICA' sea igual a 'OFICINATECNICA'
         */
        
        // Mando Estratégico
        const mandos = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'];
        req.isMando = mandos.includes(roleLimpio);

        // Oficina Técnica
        req.isOficinaTecnica = (roleLimpio === 'OFICINATECNICA');

        // Gestores Operativos (Los nuevos roles que pueden CARGAR datos)
        const esGestorOperativo = ['OPERACIONES', 'JEFE'].includes(roleLimpio);
        
        /**
         * 5. FLAG GENERAL DE GESTIÓN (isGestionUnidad)
         * Define quién puede hacer POST/PUT/DELETE en los controladores.
         */
        req.isGestionUnidad = (
            req.isMando || 
            req.isOficinaTecnica || 
            esGestorOperativo || 
            roleLimpio === 'USER' ||
            roleLimpio === 'LOGISTICO' ||
            roleLimpio === 'PERSONAL'
        );

        // Auditoría en consola del servidor
        console.log(`[AUTORIZADO] ${req.user.username} (${roleBase}) ${req.isMando ? '[MODO MANDO]' : ''}`);
        
        next(); 
    };
};

module.exports = { authorize };