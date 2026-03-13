const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Modelo de Usuario - Estándar de Seguridad Aviación de Ejército
 * Jerarquía de roles establecida para el control de actividades:
 * - admin: Gestión de personal, permisos y control total del sistema.
 * - boss: Supervisión y lectura de cronogramas (Solo Lectura).
 * - user: Carga y modificación de eventos operativos.
 */
const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'El nombre de usuario es obligatorio'], 
        unique: true, 
        trim: true,
        lowercase: true 
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
    timestamps: true // Auditoría de creación y última modificación
});

// --- ENCRIPTACIÓN DE SEGURIDAD ---
userSchema.pre('save', async function(next) {
    // Solo hashear si la contraseña es nueva o fue modificada
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// --- VERIFICACIÓN DE CREDENCIALES ---
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);