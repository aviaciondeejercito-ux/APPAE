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
    // Cronología obligatoria para Monitor de Actividades
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
        comandante: { type: String, uppercase: true, trim: true },
        copiloto: { type: String, uppercase: true, trim: true },
        mecanico: { type: String, uppercase: true, trim: true },
        pax: { type: String, uppercase: true, trim: true },
        carga: { type: String, uppercase: true, trim: true }
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
        // Alineado con Referencias: Recepción (Ambar), Revisión (Azul), Ordenada (Verde)
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
    // Validar cronología
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
        if (this.misionDetalle.comandante) this.misionDetalle.comandante = this.misionDetalle.comandante.toUpperCase();
        if (this.misionDetalle.copiloto) this.misionDetalle.copiloto = this.misionDetalle.copiloto.toUpperCase();
        if (this.misionDetalle.mecanico) this.misionDetalle.mecanico = this.misionDetalle.mecanico.toUpperCase();
        if (this.misionDetalle.pax) this.misionDetalle.pax = this.misionDetalle.pax.toUpperCase();
        if (this.misionDetalle.carga) this.misionDetalle.carga = this.misionDetalle.carga.toUpperCase();
    }
    
    if (this.ubicacion) {
        if (this.ubicacion.nombre) this.ubicacion.nombre = this.ubicacion.nombre.toUpperCase();
        this.ubicacion.lat = (this.ubicacion.lat != null) ? this.ubicacion.lat : 0;
        this.ubicacion.lng = (this.ubicacion.lng != null) ? this.ubicacion.lng : 0;
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
eventSchema.index({ "ubicacion.lat": 1, "ubicacion.lng": 1 });

module.exports = mongoose.model('Event', eventSchema);