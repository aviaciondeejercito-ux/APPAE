const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Persistencia Atómica)
 */
const eventSchema = new mongoose.Schema({
    // 1. NOMBRE DE LA OPERACIÓN
    title: { 
        type: String, 
        required: [true, 'El nombre del evento es obligatorio'], 
        trim: true,
        uppercase: true
    },
    
    // --- CAMPOS DE CALENDARIO (NO TOCAR) ---
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
    tipoApoyo: { type: String, trim: true, default: 'SOSTENIMIENTO', uppercase: true },
    sdaListado: { type: [String], default: [] },

    // --- SECCIÓN TÁCTICA Y DETALLE SIMPLIFICADA ---
    misionDetalle: {
        // 2. MATRÍCULA (Aeronave)
        matricula: { type: String, uppercase: true, trim: true, default: '' },
        aeronave: { type: String, uppercase: true, trim: true, default: '' },
        tipoIcono: { type: String, default: 'ala_rotativa' }
    },

    // Campos de respaldo
    matricula: { type: String, uppercase: true, trim: true },
    aeronave: { type: String, uppercase: true, trim: true },
    tipoIcono: { type: String },

    // 3. ORIGEN (Entrada de datos principal)
    origen: {
        nombre: { type: String, uppercase: true },
        lat: { type: Number },
        lng: { type: Number }
    },

    // 4. DESTINO (Entrada de datos independiente)
    destino: {
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
 * MIDDLEWARE PRE-SAVE: LIMPIEZA Y FORMATEO
 */
eventSchema.pre('validate', function(next) {
    // Formateo de strings generales
    if (this.title) this.title = this.title.toUpperCase();
    if (this.elemento) this.elemento = this.elemento.toUpperCase();
    
    // Verificación y formateo de ORIGEN
    if (this.origen) {
        if (this.origen.nombre) this.origen.nombre = this.origen.nombre.toUpperCase();
        // Asegurar que si no hay coordenadas, no se guarden como NaN o null si no es necesario
    }

    // Verificación y formateo de DESTINO
    if (this.destino) {
        if (this.destino.nombre) this.destino.nombre = this.destino.nombre.toUpperCase();
    }

    next();
});

eventSchema.index({ status: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);