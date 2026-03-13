const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Verificamos si el token viene en el encabezado Authorization y empieza con 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtenemos el token de la cadena (Bearer TOKEN_AQUÍ)
            token = req.headers.authorization.split(' ')[1];

            // Verificamos el token con nuestra clave secreta
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscamos el usuario y lo inyectamos en el objeto 'req' (sin la contraseña)
            // Esto permite que todos los controladores posteriores sepan quién está operando
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
            }

            next(); // El usuario es válido, puede seguir adelante
        } catch (error) {
            console.error('❌ Error en autenticación:', error.message);
            res.status(401).json({ message: 'No autorizado, token fallido' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

module.exports = { protect };