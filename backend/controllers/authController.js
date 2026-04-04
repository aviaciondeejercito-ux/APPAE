const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT seguro - ESTÁNDAR DE SEGURIDAD AE
 */
const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        console.error("❌ ERROR CRÍTICO: JWT_SECRET no definido en el servidor.");
        return null;
    }

    // NORMALIZACIÓN SINCRO JOKER: 
    // admin y user van en minúscula, el resto en MAYÚSCULA.
    let roleForToken = String(user.role || 'user').trim();
    if (['admin', 'user'].includes(roleForToken.toLowerCase())) {
        roleForToken = roleForToken.toLowerCase();
    } else {
        roleForToken = roleForToken.toUpperCase().replace(/\s+/g, '_');
    }

    const elementoNormalized = String(user.elemento || 'SIN_UNIDAD').toUpperCase().trim();

    return jwt.sign(
        { 
            id: user._id, 
            role: roleForToken, 
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

        // 2. Verificación de existencia previa (Evita Error 500 por duplicados)
        const finalUsername = username.toLowerCase().trim();
        const finalEmail = email.toLowerCase().trim();

        const userExists = await User.findOne({ 
            $or: [{ username: finalUsername }, { email: finalEmail }] 
        });

        if (userExists) {
            const campo = userExists.username === finalUsername ? 'El Identificador GDE' : 'El Email';
            return res.status(400).json({ message: `${campo} ya está registrado.` });
        }

        // 3. Normalización de campos según pedido (admin/user en minúscula, resto MAYÚS)
        let finalRole = (role || 'user').trim();
        if (['admin', 'user'].includes(finalRole.toLowerCase())) {
            finalRole = finalRole.toLowerCase();
        } else {
            finalRole = finalRole.toUpperCase().replace(/\s+/g, '_');
        }

        const finalElemento = elemento.toUpperCase().trim();

        // 4. Creación del Usuario
        const user = await User.create({ 
            nombreReal: nombreReal.trim(), 
            username: finalUsername, 
            elemento: finalElemento, 
            email: finalEmail, 
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
        console.error("🔥 ERROR EN REGISTER:", error.message);
        
        // Manejo de errores de validación de Mongoose (ej: password corto)
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: msg.join(', ') });
        }

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
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Ingrese sus credenciales' });
        }

        const user = await User.findOne({ 
            $or: [
                { nombreReal: username }, 
                { email: username.toLowerCase() },
                { username: username.toLowerCase() } 
            ] 
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await user.comparePassword(password);
        
        if (isMatch) {
            res.json({
                _id: user._id,
                nombreReal: user.nombreReal,
                username: user.username,
                role: user.role, 
                elemento: user.elemento, 
                token: generateToken(user)
            });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error("🔥 ERROR INTERNO EN LOGIN:", error.message);
        res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
    }
};