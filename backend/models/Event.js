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
        // Coordenadas actuales (o de salida por defecto)
        lat: { type: Number, default: -34.61315 },
        lng: { type: Number, default: -58.37723 }
    },

    // --- COMPATIBILIDAD Y REDUNDANCIA DE RADAR ---
    isRealTime: {
        type: Boolean,
        default: false 
    },
    // Estas representan la posición "viva" en el mapa
    lat: { type: Number, default: -34.61315 }, 
    lng: { type: Number, default: -58.37723 }, 
    
    // --- GEOLOCALIZACIÓN DE TRAYECTO (SALIDA Y LLEGADA) ---
    ubicacion: {
        nombre: { 
            type: String, 
            default: 'POSICIÓN POR COORDENADAS',
            uppercase: true 
        },
        // Punto de Salida / Despliegue
        salida: {
            nombre: { type: String, uppercase: true, default: 'ORIGEN' },
            lat: { type: Number, default: -34.61315 },
            lng: { type: Number, default: -58.37723 }
        },
        // Punto de Llegada / Destino
        llegada: {
            nombre: { type: String, uppercase: true, default: 'DESTINO' },
            lat: { type: Number, default: -34.61315 },
            lng: { type: Number, default: -58.37723 }
        },
        // Mantenemos lat/lng raíz en ubicacion para compatibilidad con código viejo
        lat: { type: Number, default: -34.61315 },
        lng: { type: Number, default: -58.37723 }
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
    // 1. Sincronización de Cronología
    if (this.start && this.end) {
        if (new Date(this.end) < new Date(this.start)) {
            this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
        }
    }
    
    // 2. Lógica de Trayecto y Sincro Joker
    // Si es un vuelo, la posición actual (this.lat) debería ser la de salida al iniciar
    // Priorizamos 'ubicacion.salida' si existe para la persistencia atómica
    const finalLat = this.ubicacion?.salida?.lat ?? this.lat ?? this.misionDetalle?.lat ?? -34.61315;
    const finalLng = this.ubicacion?.salida?.lng ?? this.lng ?? this.misionDetalle?.lng ?? -58.37723;

    // 3. Atomic Mirroring (Sincronización de espejos)
    // Aseguramos que la posición de "referencia" sea consistente
    this.lat = finalLat;
    this.lng = finalLng;

    if (this.ubicacion) {
        this.ubicacion.lat = finalLat;
        this.ubicacion.lng = finalLng;
        
        // Normalización de nombres de salida/llegada
        if (this.ubicacion.salida.nombre) this.ubicacion.salida.nombre = this.ubicacion.salida.nombre.toUpperCase();
        if (this.ubicacion.llegada.nombre) this.ubicacion.llegada.nombre = this.ubicacion.llegada.nombre.toUpperCase();
    }

    if (this.misionDetalle) {
        this.misionDetalle.lat = finalLat;
        this.misionDetalle.lng = finalLng;
        this.misionDetalle.isRealTime = this.isRealTime;

        // Normalización de campos técnicos
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