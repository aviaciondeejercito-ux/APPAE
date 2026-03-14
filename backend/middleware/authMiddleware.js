const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * MIDDLEWARE DE PROTECCIÓN - SISTEMA GESTIÓN AE
 * Bloquea el acceso si el JWT es inválido o si el usuario no tiene permisos.
 * Inyecta el usuario autenticado en 'req.user' para control de roles (Admin/Boss/User).
 */
const authMiddleware = async (req, res, next) => {
    let token;

    // 1. Verificación de seguridad: Existencia del encabezado 'Authorization Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extracción del token del encabezado
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificación del secreto de entorno (Failsafe)
            if (!process.env.JWT_SECRET) {
                console.error('❌ ERROR CRÍTICO: JWT_SECRET no detectado en las variables de entorno.');
                return res.status(500).json({ message: 'Error interno de configuración de seguridad' });
            }

            // 3. Decodificación y Verificación de Integridad del Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Inyección del Usuario en la Petición
            // Seleccionamos todo excepto el hash de la contraseña por seguridad crítica
            req.user = await User.findById(decoded.id).select('-password');

            // 5. Validación de existencia del usuario (Seguridad ante bajas recientes)
            if (!req.user) {
                return res.status(401).json({ message: 'Acceso denegado: Usuario inexistente o dado de baja' });
            }

            // 6. Autorización exitosa: El flujo continúa al siguiente middleware o controlador
            return next(); 

        } catch (error) {
            console.error(`❌ Fallo de seguridad JWT: ${error.message}`);
            
            // Gestión específica de errores de sesión
            let mensaje = 'No autorizado: Token inválido';
            if (error.name === 'TokenExpiredError') {
                mensaje = 'Sesión expirada. Por favor, ingrese nuevamente.';
            }

            return res.status(401).json({ message: mensaje });
        }
    }

    // 7. Bloqueo por falta de credenciales
    if (!token) {
        return res.status(401).json({ message: 'No autorizado: Falta token de acceso' });
    }
};

// EXPORTACIÓN DIRECTA: Esto soluciona el error de Render
module.exports = authMiddleware;