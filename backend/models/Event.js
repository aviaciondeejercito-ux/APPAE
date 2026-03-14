const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Maneja la lógica de fechas, colores y notas para el calendario interactivo.
 * Optimizado para superposición de eventos y auditoría de rangos.
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
        default: '' // Espacio dedicado para las notas detalladas
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
        default: '#3788d8' // Color por defecto (Azul AE) si el usuario no elige uno
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
    // Referencia al creador: Crucial para que el Boss sepa quién cargó el evento
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { 
    timestamps: true // Trazabilidad completa de creación y modificación
});

/**
 * VALIDACIÓN DE SEGURIDAD ATÓMICA:
 * Previene errores de carga donde la fecha de fin sea anterior o igual a la de inicio.
 */
eventSchema.pre('validate', function(next) {
    if (this.start && this.end) {
        if (this.end <= this.start) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    next();
});

// Índice para optimizar el rendimiento del calendario al cargar muchos eventos
eventSchema.index({ start: 1, end: 1 });

module.exports = mongoose.model('Event', eventSchema);