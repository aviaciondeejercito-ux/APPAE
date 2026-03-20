const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Estándar de Seguridad: Atómico, con soporte para BOSS (DIR AE) y Unidades.
 * Aplicado: Estándar de Seguridad Sincro Joker para Integridad de Datos.
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
        default: '' 
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
        default: '#1b3a57' 
    },
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
        default: '' 
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
        // Se mantienen los originales y se asegura compatibilidad con etiquetas del frontend
        enum: ['recepcion', 'revision', 'ordenada', 'solicitud'],
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
        default: false 
    },

    // --- SECCIÓN DE AUDITORÍA Y SEGURIDAD ---
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    userName: { 
        type: String, 
        required: true 
    }
}, { 
    timestamps: true 
});

/**
 * VALIDACIÓN DE SEGURIDAD ATÓMICA:
 * Previene errores lógicos de fechas y asegura integridad de color.
 */
eventSchema.pre('validate', function(next) {
    if (this.start && this.end) {
        // Asegurar que sean objetos Date para la comparación
        const dStart = new Date(this.start);
        const dEnd = new Date(this.end);

        if (dEnd < dStart) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    
    // Normalización de color
    if (this.color && !this.color.startsWith('#')) {
        this.color = '#1b3a57';
    }
    
    next();
});

// ÍNDICES PARA ALTA DISPONIBILIDAD OPERATIVA
eventSchema.index({ start: 1, end: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ esGlobal: 1 }); 
eventSchema.index({ createdBy: 1 });
eventSchema.index({ createdAt: -1 }); 

module.exports = mongoose.model('Event', eventSchema);