const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Mejora: Flujo de Aprobación DIR AE y Segmentación por Elemento.
 * Estándar: Integración de etapas (Recepción, Revisión, Ordenada).
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

    // --- SECCIÓN DE APOYOS Y REQUERIMIENTOS ---
    tipoApoyo: {
        type: String,
        trim: true,
        default: '' // Ej: "Aéreo", "Sanitario", "Logístico"
    },

    // --- SECCIÓN DE SEGURIDAD Y SEGMENTACIÓN (FLUJO DIR AE) ---
    elemento: { 
        type: String, 
        required: [true, 'La unidad/elemento es obligatoria para la segmentación'],
        index: true // Índice para búsquedas rápidas por unidad
    },
    etapa: {
        type: String,
        enum: ['recepcion', 'revision', 'ordenada'],
        default: 'recepcion',
        required: true,
        index: true
    },
    tipoOrigen: { 
        type: String, 
        enum: ['LOCAL', 'COMANDO'], 
        default: 'LOCAL',
        required: true 
    },
    esGlobal: { 
        type: Boolean, 
        default: false // Determina si la DIR AE lo envía a todas las unidades
    },

    // --- SECCIÓN DE AUDITORÍA Y SEGURIDAD ---
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    userName: { 
        type: String, 
        required: true // Nombre del operador para el panel de logs rápido
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

// ÍNDICES PARA ALTA DISPONIBILIDAD OPERATIVA
// Optimizamos la búsqueda por rango de fechas, pertenencia y etapa
eventSchema.index({ start: 1, end: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); // Fundamental para el filtrado de seguridad
eventSchema.index({ createdBy: 1 });
eventSchema.index({ createdAt: -1 }); // Para reportes de actividad reciente

module.exports = mongoose.model('Event', eventSchema);