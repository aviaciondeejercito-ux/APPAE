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
    // Agregamos fallback (|| '') para evitar que el servidor explote (Error 500) si falta un dato
    const roleNormalized = String(user.role || 'USER').toUpperCase().trim().replace(/\s+/g, '_');
    const elementoNormalized = String(user.elemento || 'SIN_UNIDAD').toUpperCase().trim();

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
        
        // 1. Verificación de campos obligatorios
        if (!nombreReal || !username || !elemento || !email || !password) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos obligatorios' });
        }

        // 2. Verificación de existencia (Normalizada)
        const userExists = await User.findOne({ username: username.toLowerCase().trim() });
        if (userExists) return res.status(400).json({ message: 'El Identificador GDE ya existe' });

        const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (emailExists) return res.status(400).json({ message: 'El Email ya está registrado' });

        // 3. Normalización de campos antes de crear
        const finalRole = (role || 'USER').toUpperCase().trim().replace(/\s+/g, '_');
        const finalElemento = elemento.toUpperCase().trim();

        // 4. Creación del Usuario
        const user = await User.create({ 
            nombreReal: nombreReal.trim(), 
            username: username.toLowerCase().trim(), 
            elemento: finalElemento, 
            email: email.toLowerCase().trim(), 
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
        } else {
            res.status(400).json({ message: 'Datos de usuario inválidos' });
        }

    } catch (error) {
        console.error("🔥 ERROR EN REGISTER:", error.message);
        res.status(500).json({ 
            message: 'Error en el servidor al registrar', 
            error: error.message 
        });
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

        // Buscamos al usuario por nombreReal, email o username
        const user = await User.findOne({ 
            $or: [
                { nombreReal: username }, 
                { email: username.toLowerCase() },
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
                role: user.role, 
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