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
    // Se mantiene opcional para permitir operaciones de Mapa Táctico sin agenda cronológica
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
        // SINCRO JOKER: Estados compatibles con Mapa Táctico y Gestión
        enum: ['programado', 'en_curso', 'en_desarrollo', 'finalizado', 'cancelado', 'operativo', 'disponible', 'emergencia'], 
        default: 'programado' 
    },

    // --- SECCIÓN DE APOYOS Y REQUERIMIENTOS ---
    tipoApoyo: {
        type: String,
        trim: true,
        default: 'GESTION',
        uppercase: true
    },
    
    sdaListado: {
        type: [String],
        default: []
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
        // 'operativo' para vuelos del mapa que no deben ir al Log/Calendario tradicional
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
    // Validar cronología solo si ambas fechas existen (Calendario)
    if (this.start && this.end) {
        const dStart = new Date(this.start);
        const dEnd = new Date(this.end);

        if (dEnd < dStart) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    
    // Normalización de color para evitar errores de renderizado
    if (this.color && !this.color.startsWith('#')) {
        this.color = '#1b3a57';
    }
    
    // Estandarización Militar (Todo a MAYÚSCULAS)
    if (this.title) this.title = this.title.toUpperCase();
    if (this.notes) this.notes = this.notes.toUpperCase();
    if (this.notasMarginales) this.notasMarginales = this.notasMarginales.toUpperCase();
    if (this.aeronave) this.aeronave = this.aeronave.toUpperCase();
    if (this.matricula) this.matricula = this.matricula.toUpperCase();
    if (this.elemento) this.elemento = this.elemento.toUpperCase();
    if (this.tipoApoyo) this.tipoApoyo = this.tipoApoyo.toUpperCase();
    
    if (this.ubicacion) {
        if (this.ubicacion.nombre) {
            this.ubicacion.nombre = this.ubicacion.nombre.toUpperCase();
        }
        // Asegurar que lat/lng no sean nulos si el objeto existe
        this.ubicacion.lat = (this.ubicacion.lat !== undefined && this.ubicacion.lat !== null) ? this.ubicacion.lat : 0;
        this.ubicacion.lng = (this.ubicacion.lng !== undefined && this.ubicacion.lng !== null) ? this.ubicacion.lng : 0;
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
eventSchema.index({ "ubicacion.lat": 1, "ubicacion.lng": 1 }); // Índice para el Mapa Táctico

module.exports = mongoose.model('Event', eventSchema);