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
        default: 'programado',
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
    // 1. Manejo de entrada desde CargaTactica (Mapeo de campos sueltos a estructura interna)
    if (this.origen) {
        this.ubicacion.salida.nombre = this.origen.nombre || this.ubicacion.salida.nombre;
        this.ubicacion.salida.lat = this.origen.lat ?? this.ubicacion.salida.lat;
        this.ubicacion.salida.lng = this.origen.lng ?? this.ubicacion.salida.lng;
    }

    if (this.destino) {
        // Lógica Aeronave Estática: Si no se pone destino (lat/lng son 0 o iguales al default), se duplica el origen
        const destinoVacio = !this.destino.lat || this.destino.lat === 0;
        
        if (destinoVacio && this.origen) {
            this.ubicacion.llegada.nombre = (this.origen.nombre || 'ESTÁTICA').toUpperCase();
            this.ubicacion.llegada.lat = this.origen.lat;
            this.ubicacion.llegada.lng = this.origen.lng;
        } else {
            this.ubicacion.llegada.nombre = this.destino.nombre || this.ubicacion.llegada.nombre;
            this.ubicacion.llegada.lat = this.destino.lat ?? this.ubicacion.llegada.lat;
            this.ubicacion.llegada.lng = this.destino.lng ?? this.ubicacion.llegada.lng;
        }
    }

    // Sincronizar campos tácticos raíz si vienen sueltos
    if (this.matricula) this.misionDetalle.matricula = this.matricula;
    if (this.aeronave) this.misionDetalle.aeronave = this.aeronave;
    if (this.tipoIcono) this.misionDetalle.tipoIcono = this.tipoIcono;

    // 2. Sincronización de Cronología
    if (this.start && this.end) {
        if (new Date(this.end) < new Date(this.start)) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    
    // 3. Lógica de Trayecto Priorizada para Despacho Táctico
    let finalLat = this.lat;
    let finalLng = this.lng;

    const isDefaultRaiz = (this.lat === -34.61315 && this.lng === -58.37723) || (this.lat === 0) || !this.lat;
    
    if (isDefaultRaiz && this.ubicacion?.salida?.lat !== undefined && this.ubicacion?.salida?.lat !== 0 && this.ubicacion?.salida?.lat !== -34.61315) {
        finalLat = this.ubicacion.salida.lat;
        finalLng = this.ubicacion.salida.lng;
    } else if (isDefaultRaiz && this.misionDetalle?.lat !== -34.61315 && this.misionDetalle?.lat !== 0) {
        finalLat = this.misionDetalle.lat;
        finalLng = this.misionDetalle.lng;
    }

    // 4. Atomic Mirroring (Sincronización de espejos)
    this.lat = finalLat;
    this.lng = finalLng;

    if (this.ubicacion) {
        this.ubicacion.lat = finalLat;
        this.ubicacion.lng = finalLng;
        if (this.ubicacion.salida?.nombre) this.ubicacion.salida.nombre = this.ubicacion.salida.nombre.toUpperCase();
        if (this.ubicacion.llegada?.nombre) this.ubicacion.llegada.nombre = this.ubicacion.llegada.nombre.toUpperCase();
    }

    if (this.misionDetalle) {
        this.misionDetalle.lat = finalLat;
        this.misionDetalle.lng = finalLng;
        this.misionDetalle.isRealTime = this.isRealTime;

        ['aeronave', 'matricula', 'comandante', 'copiloto', 'mecanico'].forEach(key => {
            if (this.misionDetalle[key]) {
                this.misionDetalle[key] = this.misionDetalle[key].toString().toUpperCase().trim();
            }
        });
    }
    
    next();
});

/**
 * ÍNDICES DE ALTO RENDIMIENTO
 */
eventSchema.index({ isRealTime: 1, status: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ lat: 1, lng: 1 }); 
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);