const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Independencia: Soporte híbrido para Calendario Operativo y Mapa Táctico.
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
    // MODIFICACIÓN: Se quita 'required' para permitir operaciones de Mapa Táctico sin agenda
    start: { 
        type: Date,
        required: false 
    },
    end: { 
        type: Date,
        required: false 
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
        // Se agrega 'en_desarrollo' para operaciones tácticas activas
        enum: ['programado', 'en_curso', 'en_desarrollo', 'finalizado', 'cancelado'], 
        default: 'programado' 
    },

    // --- SECCIÓN DE APOYOS Y REQUERIMIENTOS ---
    tipoApoyo: {
        type: String,
        trim: true,
        default: '' 
    },
    
    sdaListado: {
        type: [String],
        default: []
    },

    // --- SECCIÓN TÁCTICA (SOPORTE PARA MAPA EN TIEMPO REAL) ---
    isRealTime: {
        type: Boolean,
        default: false 
    },
    ubicacion: {
        nombre: { 
            type: String, 
            default: 'Posición por Coordenadas' 
        },
        lat: { 
            type: Number, 
            default: 0 
        },
        lng: { 
            type: Number, 
            default: 0 
        }
    },
    notasMarginales: {
        type: String, 
        default: '', 
        trim: true
    },

    // --- SECCIÓN DE SEGURIDAD Y SEGMENTACIÓN (FLUJO DIR AE) ---
    elemento: { 
        type: String, 
        required: [true, 'La unidad/elemento es obligatoria para la segmentación'],
        index: true 
    },
    etapa: {
        type: String,
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
 * Solo valida cronología si AMBAS fechas están presentes.
 */
eventSchema.pre('validate', function(next) {
    // Solo validamos lógica de fechas si el evento es para el Calendario (tiene fechas)
    if (this.start && this.end) {
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
    
    // Estandarización militar
    if (this.title) this.title = this.title.toUpperCase();
    if (this.notasMarginales) this.notasMarginales = this.notasMarginales.toUpperCase();
    
    next();
});

// ÍNDICES PARA ALTA DISPONIBILIDAD
eventSchema.index({ start: 1, end: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ esGlobal: 1 }); 
eventSchema.index({ isRealTime: 1, status: 1 }); 
eventSchema.index({ createdBy: 1 });
eventSchema.index({ createdAt: -1 }); 

module.exports = mongoose.model('Event', eventSchema);