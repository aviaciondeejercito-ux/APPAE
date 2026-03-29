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
        const allowedRoles = rolesPermitidos.map(r => r.toUpperCase().trim());

        // Comprobamos si el rol actual del usuario está dentro de la matriz de permisos autorizados
        if (!allowedRoles.includes(userRole)) {
            console.warn(`[BLOQUEO CRÍTICO] Acceso Denegado: Usuario ${req.user.username || 'N/A'} (Rol: ${userRole}) intentó acceder a una ruta restringida.`);
            
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado: El nivel jerárquico '${userRole}' no posee permisos para esta acción específica.` 
            });
        }

        /**
         * 3. LÓGICA DE MANDO (ADMIN / BOSS / DIRECTOR / OTO / OTOAE)
         * Se incluye OTO y OTOAE en isMando para que hereden la visión global de todas las unidades.
         * Esto corrige el problema de visualización de vuelos en el radar.
         */
        req.isMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(userRole);

        /**
         * 4. COMPROBACIÓN DE GESTIÓN TÉCNICA Y OPERATIVA (OFICINA_TECNICA / USER / S4 UNIDAD)
         * Inyectamos flags para facilitar la lógica de carga y mantenimiento por unidad.
         */
        req.isGestionUnidad = (userRole === 'OFICINA_TECNICA' || userRole === 'USER' || userRole === 'S4 UNIDAD');
        
        // Flag específico para Oficina Técnica (reemplaza lógica S4 anterior)
        req.isOficinaTecnica = (userRole === 'OFICINA_TECNICA');

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