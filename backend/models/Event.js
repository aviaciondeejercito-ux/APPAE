const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Persistencia Atómica)
 */
const eventSchema = new mongoose.Schema({
    // 1. NOMBRE DE LA OPERACIÓN (Título del evento)
    title: { 
        type: String, 
        required: [true, 'El nombre del evento es obligatorio'], 
        trim: true,
        uppercase: true
    },
    
    // --- CAMPOS DE CALENDARIO (NO TOCAR - FUNCIONALIDAD EXISTENTE) ---
    notes: { type: String, trim: true, default: '' },
    start: { type: Date, required: false, default: Date.now },
    end: { type: Date, required: false },
    allDay: { type: Boolean, default: false },
    color: { type: String, default: '#1b3a57' },
    type: { type: String, default: 'operativo' },
    status: { 
        type: String, 
        enum: ['programado', 'en_curso', 'en_desarrollo', 'finalizado', 'cancelado', 'operativo', 'disponible', 'emergencia'], 
        default: 'operativo',
        lowercase: true
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

    // --- SECCIÓN TÁCTICA Y DETALLE (LIMPIEZA SOLICITADA) ---
    misionDetalle: {
        // 2. MATRÍCULA (Aeronave)
        matricula: { type: String, uppercase: true, trim: true, default: '' },
        aeronave: { type: String, uppercase: true, trim: true, default: '' },
        tipoIcono: { type: String, default: 'ala_rotativa' },
        lat: { type: Number, default: -34.61315 },
        lng: { type: Number, default: -58.37723 }
    },

    lat: { type: Number, default: -34.61315 }, 
    lng: { type: Number, default: -58.37723 }, 
    
    ubicacion: {
        nombre: { type: String, default: 'POSICIÓN POR COORDENADAS', uppercase: true },
        salida: {
            nombre: { type: String, uppercase: true, default: 'ORIGEN' },
            lat: { type: Number, default: -34.61315 },
            lng: { type: Number, default: -58.37723 }
        },
        lat: { type: Number, default: -34.61315 },
        lng: { type: Number, default: -58.37723 }
    },

    matricula: { type: String, uppercase: true, trim: true },
    aeronave: { type: String, uppercase: true, trim: true },
    tipoIcono: { type: String },

    // 3. ORIGEN (Con sus coordenadas)
    origen: {
        nombre: { type: String, uppercase: true },
        lat: { type: Number },
        lng: { type: Number }
    },

    notasMarginales: { type: String, default: '', trim: true, uppercase: true },

    elemento: { 
        type: String, 
        required: [true, 'La unidad/elemento es obligatoria'],
        index: true,
        uppercase: true
    },
    etapa: {
        type: String,
        enum: ['recepcion', 'revision', 'ordenada', 'solicitud', 'operativo'],
        default: 'operativo',
        required: true,
        index: true
    },
    tipoOrigen: { type: String, enum: ['LOCAL', 'COMANDO'], default: 'LOCAL', required: true },
    esGlobal: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true, default: 'OPERADOR' }
}, { 
    timestamps: true 
});

/**
 * MIDDLEWARE PRE-SAVE: FIJACIÓN DE POSICIÓN ÚNICA
 */
eventSchema.pre('validate', function(next) {
    if (!this.ubicacion) this.ubicacion = {};
    if (!this.ubicacion.salida) this.ubicacion.salida = {};

    if (this.origen && this.origen.lat) {
        this.ubicacion.salida.nombre = (this.origen.nombre || "ORIGEN").toUpperCase();
        this.ubicacion.salida.lat = this.origen.lat;
        this.ubicacion.salida.lng = this.origen.lng;

        this.lat = this.origen.lat;
        this.lng = this.origen.lng;
        this.ubicacion.lat = this.origen.lat;
        this.ubicacion.lng = this.origen.lng;
        
        if (this.misionDetalle) {
            this.misionDetalle.lat = this.origen.lat;
            this.misionDetalle.lng = this.origen.lng;
        }
    }

    if (this.title) this.title = this.title.toUpperCase();
    if (this.elemento) this.elemento = this.elemento.toUpperCase();

    next();
});

eventSchema.index({ status: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);