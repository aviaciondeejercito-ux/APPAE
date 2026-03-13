const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT seguro
 * @param {string} id - ID del usuario
 */
const generateToken = (id) => {
    // Verificación de seguridad: Si no hay secreto, el servidor debe avisar
    if (!process.env.JWT_SECRET) {
        console.error("❌ ERROR: JWT_SECRET no definido en el archivo .env");
        return null;
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validación de campos básicos
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }

        // Crear usuario (La encriptación ocurre en el Modelo User.js)
        const user = await User.create({ username, email, password });
        
        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al registrar', error: error.message });
    }
};

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        // SEGURIDAD Y CRÍTICA: Extraemos 'username' porque es lo que envía el Login.jsx
        // Pero permitimos que 'username' contenga también el email para mayor flexibilidad.
        const { username, password } = req.body;

        // Validación de entrada
        if (!username || !password) {
            return res.status(400).json({ message: 'Por favor, ingrese sus credenciales' });
        }

        // Búsqueda Híbrida: Buscamos al usuario por su username O por su email
        const user = await User.findOne({ 
            $or: [{ username: username }, { email: username }] 
        });

        // Verificamos usuario y comparamos password usando el método del modelo
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            // Seguridad: No especificamos si falló el usuario o la clave para evitar enumeración
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
    }
};