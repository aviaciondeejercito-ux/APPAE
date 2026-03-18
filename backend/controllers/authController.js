const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT seguro
 * @param {string} id - ID del usuario
 */
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error("❌ ERROR: JWT_SECRET no definido en el archivo .env");
        return null;
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Registrar un nuevo usuario (Alta de Personal)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        // SEGURIDAD: Extraemos los campos según el nuevo estándar del modelo
        const { nombreReal, username, elemento, email, password, role } = req.body;
        
        // Validación de campos obligatorios
        if (!nombreReal || !username || !elemento || !email || !password) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos obligatorios' });
        }

        // Verificación de duplicidad: Nombre de Usuario (Credencial)
        const userExists = await User.findOne({ nombreReal });
        if (userExists) {
            return res.status(400).json({ message: 'El Nombre de Usuario ya está registrado' });
        }

        // Verificación de duplicidad: Identificador GDE
        const gdeExists = await User.findOne({ username });
        if (gdeExists) {
            return res.status(400).json({ message: 'El Identificador GDE ya existe' });
        }

        // Creación atómica del usuario
        const user = await User.create({ 
            nombreReal, 
            username, // GDE
            elemento, 
            email, 
            password,
            role: role || 'user'
        });
        
        if (user) {
            res.status(201).json({
                _id: user._id,
                nombreReal: user.nombreReal,
                username: user.username,
                role: user.role,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al registrar', error: error.message });
    }
};

// @desc    Autenticar usuario (Login por Nombre de Usuario)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        // El frontend enviará el "Usuario" en el campo 'username'
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Ingrese sus credenciales' });
        }

        // Búsqueda por NombreReal (Credencial principal) o Email
        const user = await User.findOne({ 
            $or: [{ nombreReal: username }, { email: username }] 
        });

        // Verificación de seguridad
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                nombreReal: user.nombreReal,
                username: user.username, // GDE
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
    }
};