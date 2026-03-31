/**
 * MIDDLEWARE DE AUTORIZACIÓN JERÁRQUICA - SISTEMA AE
 * Restringe el acceso a rutas específicas y valida propiedad de recursos.
 * Estandarización: Uso estricto de guion bajo para roles (Sincro Joker).
 * @param {...string} rolesPermitidos - Lista de roles autorizados
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificación de Identidad
        // Se extrae el rol directamente del objeto inyectado por la autenticación
        const userRole = req.user?.role || req.user?.user?.role;

        if (!req.user || !userRole) {
            console.error('[SEGURIDAD] Intento de autorización sin usuario identificado o sin rol asignado.');
            return res.status(401).json({ 
                success: false, 
                message: 'No autorizado: Usuario no identificado por el sistema o sesión inválida' 
            });
        }

        // 2. Normalización Estricta (Sincro Joker)
        // Convertimos a MAYÚSCULAS y eliminamos espacios para asegurar consistencia
        const normalizedUserRole = String(userRole).toUpperCase().trim();
        const allowedRoles = rolesPermitidos.map(r => String(r).toUpperCase().trim());

        // 3. Comprobación de Permisos (Búsqueda Exacta)
        // Al usar OFICINA_TECNICA en la DB y en el código, la comparación es directa y segura
        const hasPermission = allowedRoles.includes(normalizedUserRole);

        if (!hasPermission) {
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.username || 'N/A'} (Rol: ${normalizedUserRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado: El nivel jerárquico '${normalizedUserRole}' no posee permisos para esta acción específica.` 
            });
        }

        /**
         * 4. LÓGICA DE MANDO (ADMIN / BOSS / DIRECTOR / OTO / OTOAE)
         * Inyectamos flag de mando para visión global del sistema.
         * Estos roles tienen visibilidad total sobre los eventos y operaciones.
         */
        const mandoRoles = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'];
        req.isMando = mandoRoles.includes(normalizedUserRole);

        /**
         * 5. COMPROBACIÓN DE GESTIÓN TÉCNICA Y OPERATIVA
         * Inyectamos flags de gestión por unidad basados en el estándar de guion bajo.
         * Define quién puede cargar datos técnicos o modificar órdenes asignadas.
         */
        req.isOficinaTecnica = (normalizedUserRole === 'OFICINA_TECNICA');
        
        // Gestión de unidad: Incluye a los gestores técnicos, S4, usuarios operativos y mandos superiores
        req.isGestionUnidad = (
            req.isOficinaTecnica || 
            normalizedUserRole === 'S4_UNIDAD' || 
            normalizedUserRole === 'USER' || 
            req.isMando // Si es mando, por defecto tiene permisos de gestión
        );

        // Registro de Auditoría interna de accesos exitosos.
        console.log(`[AUTORIZADO] Acceso concedido a ${req.user.username || 'Sistema'} (Rol: ${normalizedUserRole}) ${req.isMando ? '[MODO MANDO ACTIVO]' : ''}`);
        
        next(); 
    };
};

/**
 * EXPORTACIÓN DE SEGURIDAD
 * Guardián de la jerarquía de mandos en las rutas del backend.
 */
module.exports = { authorize };