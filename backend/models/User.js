const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Modelo de Usuario - Estándar de Seguridad Aviación de Ejército
 * Actualización: Jerarquía de Roles (Director, OTO, OTOAE, Oficina Técnica) y Vinculación por Elemento.
 */
const userSchema = new mongoose.Schema({
    nombreReal: { 
        type: String, 
        required: [true, 'El nombre de usuario (Nombre y Apellido) es obligatorio'], 
        // Eliminado unique: true para evitar colapsos por nombres duplicados
        trim: true
    },
    username: { 
        type: String, 
        required: [true, 'El identificador GDE es obligatorio'], 
        unique: true, 
        trim: true,
        lowercase: true 
    },
    elemento: { 
        type: String, 
        required: [true, 'El elemento/unidad es obligatorio'],
        trim: true,
        uppercase: true // Asegura que la unidad siempre sea comparable
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
        // Se estandarizan los roles a MAYÚSCULAS para coincidir con el Middleware de Seguridad
        enum: [
            'ADMIN', 
            'BOSS', 
            'DIRECTOR', 
            'OTO', 
            'OTOAE',
            'USER', 
            'S4',
            'S4_UNIDAD',
            'OFICINA_TECNICA'
        ], 
        default: 'USER',
        uppercase: true,
        trim: true
    }
}, { 
    timestamps: true 
});

// --- ENCRIPTACIÓN DE SEGURIDAD (BCRYPT) ---
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(enteredPassword) {
    try {
        // Validación de seguridad: si no hay password guardado, no comparar
        if (!this.password) return false;
        return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
        console.error("Error en comparación de password:", error);
        return false;
    }
};

module.exports = mongoose.model('User', userSchema);