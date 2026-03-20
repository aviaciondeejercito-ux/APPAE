const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Estándar de Seguridad: Atómico, con soporte para BOSS (DIR AE) y Unidades.
 * Mejora: Flujo de Aprobación DIR AE y Segmentación por Elemento (1% Jackpot Standard Logic Applied to Data Integrity).
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
        default: false 
    },
    color: { 
        type: String, 
        default: '#1b3a57' // Azul AE por defecto
    },
    // Ajustado para coincidir con la dinámica del monitor operativo
    type: { 
        type: String, 
        default: 'operativo' 
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
        default: '' // Ej: "Fuerza Operativa", "Sostenimiento", "Educación"
    },
    
    // Campo crítico para el almacenamiento de medios aéreos
    sdaListado: {
        type: [String],
        default: []
    },

    // --- SECCIÓN DE SEGURIDAD Y SEGMENTACIÓN (FLUJO DIR AE) ---
    elemento: { 
        type: String, 
        required: [true, 'La unidad/elemento es obligatoria para la segmentación'],
        index: true 
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
        default: false // Si es TRUE, el BOSS lo hace visible para todas las unidades
    },

    // --- SECCIÓN DE AUDITORÍA Y SEGURIDAD ---
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    userName: { 
        type: String, 
        required: true // Jerarquía y Nombre del operador
    }
}, { 
    timestamps: true // Auditoría de creación y última modificación
});

/**
 * VALIDACIÓN DE SEGURIDAD ATÓMICA:
 * Middleware que previene errores lógicos de fechas y limpia datos antes de persistir.
 */
eventSchema.pre('validate', function(next) {
    if (this.start && this.end) {
        if (this.end < this.start) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    
    // Aseguramos que el color siempre tenga el formato correcto para el frontend
    if (!this.color.startsWith('#')) {
        this.color = '#1b3a57';
    }
    
    next();
});

// ÍNDICES PARA ALTA DISPONIBILIDAD OPERATIVA
eventSchema.index({ start: 1, end: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); // Optimización para filtrado BOSS/Unidad
eventSchema.index({ esGlobal: 1 }); 
eventSchema.index({ createdBy: 1 });
eventSchema.index({ createdAt: -1 }); 

module.exports = mongoose.model('Event', eventSchema);