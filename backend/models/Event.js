const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Independencia: Soporte híbrido para Calendario Operativo y Mapa Táctico.
 * Estándar: Segregación de Vuelos mediante etapa 'operativo'.
 */
const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El nombre del evento es obligatorio'], 
        trim: true,
        uppercase: true
    },
    notes: { 
        type: String, 
        trim: true,
        default: '' 
    },
    // Cronología: requerida para calendario, opcional para radar táctico instantáneo
    start: { 
        type: Date,
        required: false,
        default: Date.now // Garantiza que no sea nulo para evitar errores de índice
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
        enum: ['programado', 'en_curso', 'en_desarrollo', 'finalizado', 'cancelado', 'operativo', 'disponible', 'emergencia'], 
        default: 'programado' 
    },

    // --- SECCIÓN DE APOYOS Y REQUERIMIENTOS ---
    tipoApoyo: {
        type: String,
        trim: true,
        default: 'SOSTENIMIENTO',
        uppercase: true
    },
    
    sdaListado: {
        type: [String],
        default: []
    },

    // Detalle específico visto en el Monitor (Tripulación y Carga)
    misionDetalle: {
        comandante: { type: String, uppercase: true, trim: true, default: '' },
        copiloto: { type: String, uppercase: true, trim: true, default: '' },
        mecanico: { type: String, uppercase: true, trim: true, default: '' },
        pax: { type: String, uppercase: true, trim: true, default: '' },
        carga: { type: String, uppercase: true, trim: true, default: '' }
    },

    // --- SECCIÓN TÁCTICA (SOPORTE PARA MAPA EN TIEMPO REAL) ---
    aeronave: { 
        type: String, 
        trim: true,
        uppercase: true 
    },
    matricula: { 
        type: String, 
        trim: true,
        uppercase: true 
    },
    tipoIcono: { 
        type: String, 
        enum: ['ala_fija', 'ala_rotativa'],
        default: 'ala_rotativa' 
    },
    isRealTime: {
        type: Boolean,
        default: false 
    },
    // Compatibilidad para filtros directos de coordenadas
    lat: { type: Number },
    lng: { type: Number },
    
    ubicacion: {
        nombre: { 
            type: String, 
            default: 'POSICIÓN POR COORDENADAS',
            uppercase: true 
        },
        lat: { 
            type: Number, 
            default: 0,
            min: -90,
            max: 90
        },
        lng: { 
            type: Number, 
            default: 0,
            min: -180,
            max: 180
        }
    },
    notasMarginales: {
        type: String, 
        default: '', 
        trim: true,
        uppercase: true
    },

    // --- SECCIÓN DE SEGURIDAD Y SEGMENTACIÓN (FLUJO DIR AE) ---
    elemento: { 
        type: String, 
        required: [true, 'La unidad/elemento es obligatoria para la segmentación'],
        index: true,
        uppercase: true
    },
    etapa: {
        type: String,
        enum: ['recepcion', 'revision', 'ordenada', 'solicitud', 'operativo'],
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
 * VALIDACIÓN DE SEGURIDAD ATÓMICA Y ESTANDARIZACIÓN MILITAR
 */
eventSchema.pre('validate', function(next) {
    // Validar cronología si ambos existen
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
    
    // Estandarización Militar (Todo a MAYÚSCULAS)
    const fieldsToUpper = [
        'title', 'notes', 'notasMarginales', 'aeronave', 
        'matricula', 'elemento', 'tipoApoyo'
    ];

    fieldsToUpper.forEach(field => {
        if (this[field]) this[field] = this[field].toUpperCase();
    });

    if (this.misionDetalle) {
        ['comandante', 'copiloto', 'mecanico', 'pax', 'carga'].forEach(key => {
            if (this.misionDetalle[key]) {
                this.misionDetalle[key] = this.misionDetalle[key].toUpperCase();
            }
        });
    }
    
    // Sincronización de coordenadas duplicadas para búsqueda optimizada
    if (this.ubicacion) {
        if (this.ubicacion.nombre) this.ubicacion.nombre = this.ubicacion.nombre.toUpperCase();
        
        // Si vienen coordenadas en ubicación, las espejamos en la raíz para el radar
        if (this.ubicacion.lat != null) this.lat = this.ubicacion.lat;
        if (this.ubicacion.lng != null) this.lng = this.ubicacion.lng;
    }
    
    next();
});

// ÍNDICES PARA ALTA DISPONIBILIDAD Y SEGURIDAD
eventSchema.index({ start: 1, end: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ esGlobal: 1 }); 
eventSchema.index({ isRealTime: 1, status: 1 }); 
eventSchema.index({ createdBy: 1 });
eventSchema.index({ createdAt: -1 }); 
eventSchema.index({ lat: 1, lng: 1 });
eventSchema.index({ "ubicacion.lat": 1, "ubicacion.lng": 1 });

module.exports = mongoose.model('Event', eventSchema);