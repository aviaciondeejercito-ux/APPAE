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
        // Se normaliza a MAYÚSCULAS para evitar errores de case-sensitivity
        const userRole = req.user.role.toUpperCase().trim();
        const allowedRoles = rolesPermitidos.map(r => r.toUpperCase().trim().replace(/\s+/g, '_'));

        // Normalizamos el rol del usuario para la comparación (ej: "OFICINA TECNICA" -> "OFICINA_TECNICA")
        const normalizedUserRole = userRole.replace(/\s+/g, '_');

        // Comprobamos si el rol actual del usuario está dentro de la matriz de permisos autorizados
        if (!allowedRoles.includes(normalizedUserRole)) {
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.username || 'N/A'} (Rol: ${normalizedUserRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado: El nivel jerárquico '${normalizedUserRole}' no posee permisos para esta acción específica.` 
            });
        }

        /**
         * 3. LÓGICA DE MANDO (ADMIN / BOSS / DIRECTOR / OTO / OTOAE)
         * Se incluye OTO y OTOAE en isMando para que hereden la visión global de todas las unidades.
         * Esto corrige el problema de visualización de vuelos en el radar.
         */
        req.isMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(normalizedUserRole);

        /**
         * 4. COMPROBACIÓN DE GESTIÓN TÉCNICA Y OPERATIVA (OFICINA_TECNICA / USER / S4 UNIDAD)
         * Inyectamos flags para facilitar la lógica de carga y mantenimiento por unidad.
         */
        req.isGestionUnidad = (normalizedUserRole === 'OFICINA_TECNICA' || normalizedUserRole === 'USER' || normalizedUserRole === 'S4_UNIDAD');
        
        // Flag específico para Oficina Técnica (reemplaza lógica S4 anterior)
        req.isOficinaTecnica = (normalizedUserRole === 'OFICINA_TECNICA');

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