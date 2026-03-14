const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Optimizado para visualización de imagen pura y superposición.
 */
const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El nombre del evento es obligatorio'], 
        trim: true 
    },
    notes: { 
        type: String, 
        trim: true,
        default: '' // Espacio para las notas detalladas que verá el Boss al pasar el mouse
    },
    start: { 
        type: Date, 
        required: [true, 'La fecha de inicio es obligatoria'] 
    },
    end: { 
        type: Date, 
        required: [true, 'La fecha de fin es obligatoria'] 
    },
    color: { 
        type: String, 
        default: '#1b3a57' // Azul AE por defecto
    },
    type: { 
        type: String, 
        enum: ['operativo', 'mantenimiento', 'vuelo', 'guardia', 'instruccion', 'especial'], 
        default: 'especial' 
    },
    status: { 
        type: String, 
        enum: ['programado', 'en_curso', 'finalizado', 'cancelado'], 
        default: 'programado' 
    },
    // AUDITORÍA Y LOGS:
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    userName: { 
        type: String, 
        required: true // Almacena el nombre del operador para el panel de logs
    }
}, { 
    timestamps: true // Registra exactamente cuándo se creó/editó la actividad
});

/**
 * VALIDACIÓN DE SEGURIDAD ATÓMICA:
 * Previene errores de carga de datos corruptos (Fecha fin < Fecha inicio).
 */
eventSchema.pre('validate', function(next) {
    if (this.start && this.end) {
        if (this.end <= this.start) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    next();
});

// Índice para carga ultra-rápida del calendario
eventSchema.index({ start: 1, end: 1 });

module.exports = mongoose.model('Event', eventSchema);