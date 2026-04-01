const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Seguridad: Trazabilidad completa con logs de usuario integrados.
 * Estándar de Seguridad: SINCRO JOKER
 * - Normalización estricta a MAYÚSCULAS en pre-validation.
 * - Sincronización atómica de coordenadas (Mirroring lat/lng).
 * - Optimización de índices para Mapa Táctico y Calendario.
 * - Restricción de Visibilidad: Separación de dominios (Mapa vs Calendario).
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
        default: Date.now 
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
    // Compatibilidad para filtros directos de coordenadas (Mirror de ubicacion)
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

    // --- SECCIÓN DE SEGURIDAD Y SEGMENTACIÓN ---
    elemento: { 
        type: String, 
        required: [true, 'La unidad/elemento es obligatoria'],
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

    // --- SECCIÓN DE AUDITORÍA ---
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
 * MIDDLEWARE PRE-SAVE: VALIDACIÓN Y ESTANDARIZACIÓN MILITAR
 */
eventSchema.pre('validate', function(next) {
    // 1. Validación de Cronología
    if (this.start && this.end) {
        if (new Date(this.end) < new Date(this.start)) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    
    // 2. Normalización de Mayúsculas (Estándar Sincro Joker)
    const fieldsToUpper = [
        'title', 'notes', 'notasMarginales', 'aeronave', 
        'matricula', 'elemento', 'tipoApoyo'
    ];

    fieldsToUpper.forEach(field => {
        if (this[field]) {
            this[field] = this[field].toString().toUpperCase();
        }
    });

    if (this.misionDetalle) {
        ['comandante', 'copiloto', 'mecanico', 'pax', 'carga'].forEach(key => {
            if (this.misionDetalle[key]) {
                this.misionDetalle[key] = this.misionDetalle[key].toString().toUpperCase();
            }
        });
    }
    
    // 3. Sincronización de Coordenadas (Atomic Mirroring)
    if (this.ubicacion) {
        if (this.ubicacion.nombre) {
            this.ubicacion.nombre = this.ubicacion.nombre.toString().toUpperCase();
        }
        
        // Espejamos coordenadas a la raíz para filtros de radar rápidos
        // Si es isRealTime pero no tiene coordenadas, forzamos valores de seguridad (0,0 o base)
        if (this.ubicacion.lat != null) this.lat = this.ubicacion.lat;
        if (this.ubicacion.lng != null) this.lng = this.ubicacion.lng;
    }
    
    // 4. Corrección de color por defecto
    if (this.color && !this.color.startsWith('#')) {
        this.color = '#1b3a57';
    }
    
    next();
});

/**
 * ÍNDICES DE ALTO RENDIMIENTO (SINCRO JOKER)
 * Optimizados para la separación de Calendario (isRealTime: false) y Mapa (isRealTime: true)
 */
eventSchema.index({ isRealTime: 1, start: 1, end: 1 }); // Filtro principal para el Calendario
eventSchema.index({ isRealTime: 1, status: 1 }); // Filtro principal para el Mapa Táctico
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ lat: 1, lng: 1 }); // Índice para búsqueda geoespacial simple
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);