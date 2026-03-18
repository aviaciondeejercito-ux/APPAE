const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Modelo de Usuario - Estándar de Seguridad Aviación de Ejército
 * Actualización: El acceso se realiza mediante 'nombreReal' (Usuario).
 * El 'username' se mantiene como identificador GDE secundario.
 */
const userSchema = new mongoose.Schema({
    nombreReal: { 
        type: String, 
        required: [true, 'El nombre de usuario (Nombre y Apellido) es obligatorio'], 
        unique: true, // Credencial principal de acceso
        trim: true
    },
    username: { 
        type: String, 
        required: [true, 'El identificador GDE es obligatorio'], 
        unique: true, // Evita duplicidad de legajos GDE
        trim: true,
        lowercase: true 
    },
    elemento: { 
        type: String, 
        required: [true, 'El elemento/unidad es obligatorio'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'El correo electrónico es obligatorio'], 
        unique: true, 
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Ingrese un email institucional o válido']
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    role: { 
        type: String, 
        enum: ['user', 'admin', 'boss'], 
        default: 'user' 
    }
}, { 
    timestamps: true // Auditoría de seguridad: creación y última modificación
});

// --- ENCRIPTACIÓN DE SEGURIDAD (BCRYPT) ---
userSchema.pre('save', async function(next) {
    // Solo hashear si la contraseña es nueva o fue modificada
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// --- VERIFICACIÓN DE CREDENCIALES ---
// Usamos una función tradicional para asegurar que 'this' apunte al documento
userSchema.methods.comparePassword = async function(enteredPassword) {
    try {
        return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
        return false;
    }
};

module.exports = mongoose.model('User', userSchema);