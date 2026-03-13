const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Modelo de Usuario - Estándar de Seguridad AE
 * Incluye validaciones estrictas y jerarquía de roles:
 * - admin: Control total y gestión de permisos.
 * - boss: Modo visualización (lectura de calendario).
 * - user: Carga de actividades.
 */
const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'El nombre de usuario es obligatorio'], 
        unique: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'El correo electrónico es obligatorio'], 
        unique: true, 
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, ingrese un email válido']
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    role: { 
        type: String, 
        enum: ['user', 'admin', 'boss'], // Jerarquía actualizada según requerimiento
        default: 'user' 
    },
    // Saldo para la lógica de casino/negocio (Sincro Joker)
    balance: { 
        type: Number, 
        default: 0, 
        min: [0, 'El saldo no puede ser negativo'] 
    }
}, { 
    timestamps: true // Registra createdAt y updatedAt automáticamente
});

// Encriptación antes de guardar
userSchema.pre('save', async function(next) {
    // Si no se modificó la contraseña (ej. se actualizó el saldo), saltamos el proceso
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas (Utilizado en authController)
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);