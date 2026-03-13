/**
 * Middleware para restringir acceso según el rol del usuario
 * @param {...string} rolesPermitidos - Lista de roles que pueden acceder (ej: 'admin', 'user')
 */
const authorize = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Verificamos si el usuario existe (inyectado por authMiddleware)
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado, usuario no identificado' });
        }

        // Verificamos si el rol del usuario está en la lista de permitidos
        if (!rolesPermitidos.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Acceso denegado: El rol '${req.user.role}' no tiene permisos para esta acción` 
            });
        }

        next(); // El usuario tiene el rol adecuado, puede continuar
    };
};

module.exports = { authorize };