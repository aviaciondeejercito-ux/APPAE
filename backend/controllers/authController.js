const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT seguro
 */
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error("❌ ERROR CRÍTICO: JWT_SECRET no definido en el servidor.");
        return null;
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Registrar un nuevo usuario (Alta de Personal)
exports.register = async (req, res) => {
    try {
        const { nombreReal, username, elemento, email, password, role } = req.body;
        
        if (!nombreReal || !username || !elemento || !email || !password) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos obligatorios' });
        }

        const userExists = await User.findOne({ nombreReal });
        if (userExists) return res.status(400).json({ message: 'El Nombre de Usuario ya está registrado' });

        const gdeExists = await User.findOne({ username });
        if (gdeExists) return res.status(400).json({ message: 'El Identificador GDE ya existe' });

        const user = await User.create({ 
            nombreReal, 
            username, 
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

// @desc    Autenticar usuario (Login)
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // --- LOG DE RASTREO ---
        console.log("--- INTENTO DE ACCESO ---");
        console.log("👤 Input Usuario:", username);

        if (!username || !password) {
            return res.status(400).json({ message: 'Ingrese sus credenciales' });
        }

        // Buscamos al usuario
        const user = await User.findOne({ 
            $or: [{ nombreReal: username }, { email: username }] 
        });

        if (!user) {
            console.log("❌ RESULTADO: Usuario no encontrado en la Base de Datos.");
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        console.log("✅ RESULTADO: Usuario hallado ->", user.nombreReal);
        console.log("🔑 Verificando hash de contraseña...");

        // Verificación de contraseña usando el método del modelo
        const isMatch = await user.comparePassword(password);
        
        if (isMatch) {
            console.log("🔓 ACCESO CONCEDIDO para:", user.nombreReal);
            res.json({
                _id: user._id,
                nombreReal: user.nombreReal,
                username: user.username,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            console.log("🚫 ERROR: La contraseña no coincide con el Hash de la DB.");
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error("🔥 ERROR INTERNO EN LOGIN:", error.message);
        res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
    }
};