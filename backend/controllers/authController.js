const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT seguro - ESTÁNDAR DE SEGURIDAD AE
 * Ahora incluye ID, Rol y Elemento dentro del payload para evitar consultas extra.
 */
const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        console.error("❌ ERROR CRÍTICO: JWT_SECRET no definido en el servidor.");
        return null;
    }

    // NORMALIZACIÓN SINCRO JOKER: Aseguramos formato para el Payload del Token
    const roleNormalized = String(user.role).toUpperCase().trim().replace(/\s+/g, '_');
    const elementoNormalized = String(user.elemento).toUpperCase().trim();

    return jwt.sign(
        { 
            id: user._id, 
            role: roleNormalized, 
            elemento: elementoNormalized 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );
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

        // Normalización antes de crear en DB
        const finalRole = (role || 'USER').toUpperCase().trim().replace(/\s+/g, '_');

        const user = await User.create({ 
            nombreReal, 
            username, 
            elemento: elemento.toUpperCase().trim(), 
            email, 
            password,
            role: finalRole
        });
        
        if (user) {
            res.status(201).json({
                _id: user._id,
                nombreReal: user.nombreReal,
                username: user.username,
                elemento: user.elemento, 
                role: user.role,
                token: generateToken(user)
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
        
        console.log("--- INTENTO DE ACCESO ---");
        console.log("👤 Input Usuario:", username);

        if (!username || !password) {
            return res.status(400).json({ message: 'Ingrese sus credenciales' });
        }

        // Buscamos al usuario por nombreReal o email (con soporte para GDE si fuera necesario)
        const user = await User.findOne({ 
            $or: [
                { nombreReal: username }, 
                { email: username },
                { username: username.toLowerCase() } 
            ] 
        });

        if (!user) {
            console.log("❌ RESULTADO: Usuario no encontrado.");
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        console.log("✅ RESULTADO: Usuario hallado ->", user.nombreReal);
        console.log("🔑 Verificando hash de contraseña...");

        const isMatch = await user.comparePassword(password);
        
        if (isMatch) {
            console.log("🔓 ACCESO CONCEDIDO para:", user.nombreReal);
            
            // Generamos el token con la lógica de normalización incluida
            const token = generateToken(user);

            // Enviamos respuesta al Frontend con datos sincronizados
            res.json({
                _id: user._id,
                nombreReal: user.nombreReal,
                username: user.username,
                role: user.role, // Ya viene normalizado por el modelo y generateToken
                elemento: user.elemento, 
                token: token
            });
        } else {
            console.log("🚫 ERROR: Contraseña incorrecta.");
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error("🔥 ERROR INTERNO EN LOGIN:", error.message);
        res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
    }
};