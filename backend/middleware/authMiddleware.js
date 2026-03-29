const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * MIDDLEWARE DE PROTECCIÓN - SISTEMA GESTIÓN AE
 * Bloquea el acceso si el JWT es inválido o si el usuario no tiene permisos.
 * Inyecta el usuario autenticado en 'req.user' con su Rol y Elemento.
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
                return res.status(500).json({ 
                    success: false,
                    message: 'Error interno de configuración de seguridad' 
                });
            }

            // 3. Decodificación y Verificación de Integridad del Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Inyección del Usuario en la Petición
            // .select('-password') asegura que la clave nunca viaje en req.user
            const userFound = await User.findById(decoded.id).select('-password');

            // 5. Validación de existencia del usuario (Seguridad ante bajas recientes)
            if (!userFound) {
                console.warn(`[SEGURIDAD] Intento de uso de token de usuario eliminado o inexistente. ID: ${decoded.id}`);
                return res.status(401).json({ 
                    success: false,
                    message: 'Acceso denegado: Usuario inexistente o dado de baja' 
                });
            }

            // NORMALIZACIÓN DE DATOS PARA LÓGICA DE CONTROLADORES Y AUTHORIZE
            // SINCRO JOKER: Sincronizamos con la base de datos y rolecheck.js
            req.user = userFound;
            
            if (req.user.elemento) {
                req.user.elemento = req.user.elemento.toString().toUpperCase().trim();
            }
            
            if (req.user.role) {
                /**
                 * CORRECCIÓN DE COMPATIBILIDAD:
                 * Mantenemos el formato original de la DB (Mayúsculas y espacios simples).
                 * Esto evita que 'OFICINA TECNICA' se rompa al convertirse en 'OFICINA_TECNICA'
                 * si el autorizador espera el string con espacios.
                 */
                req.user.role = req.user.role.toString().toUpperCase().trim().replace(/\s+/g, ' ');
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

            return res.status(401).json({ 
                success: false, 
                message: mensaje 
            });
        }
    }

    // 7. Bloqueo por falta de credenciales
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado: Falta token de acceso' 
        });
    }
};

/**
 * EXPORTACIÓN COMPUESTA (Solución definitiva para Render/Vercel/Local)
 * Mantenemos todas las variantes para asegurar que no se rompa ninguna ruta.
 */
module.exports = authMiddleware;
module.exports.protect = authMiddleware;
module.exports.verifyToken = authMiddleware;