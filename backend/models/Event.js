const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Optimizado para visualización de imagen pura y superposición en calendario.
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
        default: '' // Notas detalladas visibles al pasar el mouse (Tooltip)
    },
    start: { 
        type: Date, 
        required: [true, 'La fecha de inicio es obligatoria'] 
    },
    end: { 
        type: Date, 
        required: [true, 'La fecha de fin es obligatoria'] 
    },
    allDay: {
        type: Boolean,
        default: false // Útil para eventos de 24hs o Guardias
    },
    color: { 
        type: String, 
        default: '#1b3a57' // Azul AE por defecto
    },
    type: { 
        type: String, 
        enum: ['operativo', 'mantenimiento', 'vuelo', 'guardia', 'instruccion', 'especial', 'comision'], 
        default: 'especial' 
    },
    status: { 
        type: String, 
        enum: ['programado', 'en_curso', 'finalizado', 'cancelado'], 
        default: 'programado' 
    },
    // --- SECCIÓN DE AUDITORÍA Y SEGURIDAD ---
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    userName: { 
        type: String, 
        required: true // Nombre del operador GDE para el panel de logs rápido
    }
}, { 
    timestamps: true // Genera automáticamente createdAt y updatedAt
});

/**
 * VALIDACIÓN DE SEGURIDAD ATÓMICA:
 * Middleware de Mongoose que previene errores lógicos de fechas antes de guardar.
 */
eventSchema.pre('validate', function(next) {
    if (this.start && this.end) {
        if (this.end < this.start) {
            this.invalidate('end', 'La fecha de finalización debe ser igual o posterior a la de inicio');
        }
    }
    next();
});

// ÍNDICES PARA ALTA DISPONIBILIDAD
// Optimizamos la búsqueda por rango de fechas para que el calendario no se ralentice
eventSchema.index({ start: 1, end: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Event', eventSchema);