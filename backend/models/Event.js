const mongoose = require('mongoose');

/**
 * MODELO DE EVENTOS / ACTIVIDADES - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Persistencia Atómica)
 * Acción: Soporte de Trayecto (Origen/Destino) y Sincronización de Espejos
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

    // --- SECCIÓN TÁCTICA Y DETALLE (ESTRUCTURA UNIFICADA DB) ---
    misionDetalle: {
        comandante: { type: String, uppercase: true, trim: true, default: '' },
        copiloto: { type: String, uppercase: true, trim: true, default: '' },
        mecanico: { type: String, uppercase: true, trim: true, default: '' },
        pax: { type: String, uppercase: true, trim: true, default: '' },
        carga: { type: String, uppercase: true, trim: true, default: '' },
        aeronave: { type: String, uppercase: true, trim: true, default: '' },
        matricula: { type: String, uppercase: true, trim: true, default: '' },
        tipoIcono: { 
            type: String, 
            enum: ['ala_fija', 'ala_rotativa'],
            default: 'ala_rotativa' 
        },
        isRealTime: { type: Boolean, default: false },
        lat: { type: Number, default: -34.61315 },
        lng: { type: Number, default: -58.37723 }
    },

    // --- COMPATIBILIDAD Y REDUNDANCIA DE RADAR ---
    isRealTime: {
        type: Boolean,
        default: false 
    },
    lat: { type: Number, default: -34.61315 }, 
    lng: { type: Number, default: -58.37723 }, 
    
    // --- GEOLOCALIZACIÓN DE TRAYECTO (SALIDA Y LLEGADA) ---
    ubicacion: {
        nombre: { 
            type: String, 
            default: 'POSICIÓN POR COORDENADAS',
            uppercase: true 
        },
        salida: {
            nombre: { type: String, uppercase: true, default: 'ORIGEN' },
            lat: { type: Number, default: -34.61315 },
            lng: { type: Number, default: -58.37723 }
        },
        llegada: {
            nombre: { type: String, uppercase: true, default: 'DESTINO' },
            lat: { type: Number, default: -34.61315 },
            lng: { type: Number, default: -58.37723 }
        },
        lat: { type: Number, default: -34.61315 },
        lng: { type: Number, default: -58.37723 }
    },

    // --- CAMPOS PARA SOPORTE DIRECTO DESDE CARGA TACTICA ---
    matricula: { type: String, uppercase: true, trim: true },
    aeronave: { type: String, uppercase: true, trim: true },
    tipoIcono: { type: String },
    origen: {
        nombre: { type: String, uppercase: true },
        lat: { type: Number },
        lng: { type: Number }
    },
    destino: {
        nombre: { type: String, uppercase: true },
        lat: { type: Number },
        lng: { type: Number }
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
        default: 'operativo',
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
        required: false 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    userName: { 
        type: String, 
        required: true,
        default: 'OPERADOR'
    }
}, { 
    timestamps: true 
});

/**
 * MIDDLEWARE PRE-SAVE: VALIDACIÓN Y ESTANDARIZACIÓN MILITAR
 */
eventSchema.pre('validate', function(next) {
    // 0. Corrección de Enum de Status
    const validStatuses = ['programado', 'en_curso', 'en_desarrollo', 'finalizado', 'cancelado', 'operativo', 'disponible', 'emergencia'];
    if (this.status) {
        this.status = this.status.toLowerCase().trim();
        if (!validStatuses.includes(this.status)) {
            this.status = 'operativo';
        }
    }

    // Asegurar existencia de sub-objetos
    if (!this.ubicacion) this.ubicacion = {};
    if (!this.ubicacion.salida) this.ubicacion.salida = {};
    if (!this.ubicacion.llegada) this.ubicacion.llegada = {};
    if (!this.misionDetalle) this.misionDetalle = {};

    // 1. Manejo de Origen (Prioridad a datos de CargaTactica)
    if (this.origen && (this.origen.lat || this.origen.lat === 0)) {
        this.ubicacion.salida.nombre = (this.origen.nombre || 'ORIGEN').toUpperCase();
        this.ubicacion.salida.lat = this.origen.lat;
        this.ubicacion.salida.lng = this.origen.lng;
        this.ubicacion.nombre = this.ubicacion.salida.nombre;
    }

    // 2. Manejo de Destino (Arreglo: Prioridad absoluta si viene de CargaTactica)
    if (this.destino && (this.destino.lat || this.destino.lat === 0)) {
        // Validamos si el destino es diferente al origen para evitar el error de "estática"
        const esMismoPunto = this.origen && 
                           this.origen.lat === this.destino.lat && 
                           this.origen.lng === this.destino.lng;

        this.ubicacion.llegada.nombre = (this.destino.nombre || (esMismoPunto ? 'ESTÁTICA' : 'DESTINO')).toUpperCase();
        this.ubicacion.llegada.lat = this.destino.lat;
        this.ubicacion.llegada.lng = this.destino.lng;
    } else if (this.origen) {
        // Solo si no hay objeto destino, clonamos origen
        this.ubicacion.llegada.nombre = "ESTÁTICA";
        this.ubicacion.llegada.lat = this.origen.lat;
        this.ubicacion.llegada.lng = this.origen.lng;
    }

    // Sincronizar campos tácticos raíz a misionDetalle
    if (this.matricula) this.misionDetalle.matricula = this.matricula;
    if (this.aeronave) this.misionDetalle.aeronave = this.aeronave;
    if (this.tipoIcono) this.misionDetalle.tipoIcono = this.tipoIcono;

    // 3. Sincronización de Radar (Posición Inicial)
    if (this.ubicacion.salida && (this.ubicacion.salida.lat !== -34.61315)) {
        this.lat = this.ubicacion.salida.lat;
        this.lng = this.ubicacion.salida.lng;
    }

    // 4. Atomic Mirroring (Sincronización de todos los espejos de posición)
    this.ubicacion.lat = this.lat;
    this.ubicacion.lng = this.lng;
    this.misionDetalle.lat = this.lat;
    this.misionDetalle.lng = this.lng;
    this.misionDetalle.isRealTime = this.isRealTime;

    if (this.title) this.title = this.title.toUpperCase();
    if (this.elemento) this.elemento = this.elemento.toUpperCase();
    
    next();
});

/**
 * ÍNDICES DE ALTO RENDIMIENTO
 */
eventSchema.index({ isRealTime: 1, status: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);