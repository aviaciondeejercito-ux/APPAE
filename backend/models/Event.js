const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Maneja la lógica de fechas y trazabilidad para el calendario interactivo.
 */
const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El título del evento es obligatorio'], 
        trim: true 
    },
    description: { 
        type: String, 
        trim: true 
    },
    start: { 
        type: Date, 
        required: [true, 'La fecha de inicio es obligatoria'] 
    },
    end: { 
        type: Date, 
        required: [true, 'La fecha de fin es obligatoria'] 
    },
    type: { 
        type: String, 
        // Corregido: Tipos de eventos reales para gestión de personal y aeronaves
        enum: ['operativo', 'mantenimiento', 'vuelo', 'guardia', 'instruccion', 'especial'], 
        default: 'especial' 
    },
    status: { 
        type: String, 
        enum: ['programado', 'en_curso', 'finalizado', 'cancelado'], 
        default: 'programado' 
    },
    // Referencia al creador para auditoría del Boss y Admin
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { 
    timestamps: true // Permite ver cuándo se creó/modificó el registro
});

/**
 * VALIDACIÓN DE SEGURIDAD:
 * Previene errores de carga donde la fecha de fin sea anterior a la de inicio.
 */
eventSchema.pre('validate', function(next) {
    if (this.start && this.end) {
        if (this.end <= this.start) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    next();
});

// Índice para optimizar búsquedas por rango de fechas en el calendario
eventSchema.index({ start: 1, end: 1 });

module.exports = mongoose.model('Event', eventSchema);