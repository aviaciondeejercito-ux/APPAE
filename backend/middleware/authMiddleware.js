const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * MIDDLEWARE DE PROTECCIÓN - SISTEMA GESTIÓN AE
 * Bloquea el acceso a cualquier ruta si el JWT no es válido.
 * Inyecta el usuario autenticado en 'req.user' para control de roles (Admin/Boss/User).
 */
const protect = async (req, res, next) => {
    let token;

    // 1. Verificación de seguridad: Existencia del encabezado 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtenemos el token (Bearer [TOKEN])
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificación del secreto de entorno
            if (!process.env.JWT_SECRET) {
                console.error('❌ ERROR CRÍTICO: JWT_SECRET no configurado en el servidor.');
                return res.status(500).json({ message: 'Error interno de configuración de seguridad' });
            }

            // 3. Decodificación y Verificación del Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Inyección del Usuario (Excluyendo el hash de la contraseña por seguridad)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Acceso denegado: El usuario ya no existe' });
            }

            // 5. Autorización exitosa: Continuar al siguiente controlador o middleware
            return next(); 

        } catch (error) {
            console.error('❌ Error de validación JWT:', error.message);
            
            // Diferenciamos si el token expiró o es inválido para el debug
            const msg = error.name === 'TokenExpiredError' ? 'Sesión expirada' : 'Token inválido';
            return res.status(401).json({ message: `No autorizado: ${msg}` });
        }
    }

    // 6. Si no hay token en absoluto
    if (!token) {
        return res.status(401).json({ message: 'No autorizado: Se requiere una sesión activa' });
    }
};

module.exports = { protect };