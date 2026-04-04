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
    
    // --- CAMPOS DE CALENDARIO Y CLASIFICACIÓN ---
    notes: { type: String, trim: true, default: '' },
    start: { type: Date, required: false, default: Date.now },
    end: { type: Date, required: false },
    allDay: { type: Boolean, default: false },
    color: { type: String, default: '#1b3a57' },
    
    /**
     * CLASIFICACIÓN DE LA MISIÓN
     * Determina el color y tipo de actividad (SOSTENIMIENTO, FUERZA OPERATIVA, EDUCACION, OTROS)
     */
    mision: { 
        type: String, 
        uppercase: true, 
        trim: true, 
        default: 'OTROS' 
    },

    type: { type: String, default: 'operativo' },
    status: { 
        type: String, 
        enum: ['programado', 'en_curso', 'en_desarrollo', 'finalizado', 'cancelado', 'operativo', 'disponible', 'emergencia'], 
        default: 'operativo',
        lowercase: true
    },

    // --- SECCIÓN DE APOYOS Y REQUERIMIENTOS ---
    tipoApoyo: { type: String, trim: true, default: 'SOSTENIMIENTO', uppercase: true },
    
    /**
     * REQUERIMIENTO TÉCNICO (SDA Y CANTIDAD)
     * Permite que DIR AE solicite material (ej: 2x C-208) sin conocer matrículas.
     * También almacena las matrículas seleccionadas por las unidades.
     */
    sdaListado: { 
        type: [{
            sda: { type: String, uppercase: true, trim: true },
            cantidad: { type: Number, default: 1 }
        }], 
        default: [] 
    },

    // --- SECCIÓN TÁCTICA Y DETALLE SIMPLIFICADA ---
    misionDetalle: {
        // MATRÍCULA (Asignada por la Unidad Responsable)
        matricula: { type: String, uppercase: true, trim: true, default: '' },
        aeronave: { type: String, uppercase: true, trim: true, default: '' },
        tipoIcono: { type: String, default: 'ala_rotativa' }
    },

    // Campos de respaldo
    matricula: { type: String, uppercase: true, trim: true },
    aeronave: { type: String, uppercase: true, trim: true },
    tipoIcono: { type: String },
    isRealTime: { type: Boolean, default: false }, 

    // ORIGEN Y DESTINO
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

    notasMarginales: { type: String, default: '', trim: true, uppercase: true },

    // UNIDAD RESPONSABLE (La que debe poner la matrícula)
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

    tipoOrigen: { type: String, enum: ['LOCAL', 'COMANDO'], default: 'LOCAL', required: true },
    esGlobal: { type: Boolean, default: false },

    // --- SECCIÓN DE AUTORÍA Y PECERA ESTANCA ---
    creadorUnidad: { type: String, uppercase: true, index: true }, 
    unidadApoyada: { type: String, uppercase: true, trim: true, default: '' },
    pntoContactoNom: { type: String, trim: true, default: '' },
    pntoContactoTel: { type: String, trim: true, default: '' },
    responsableNom: { type: String, trim: true, default: '' },
    responsableTel: { type: String, trim: true, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true, default: 'OPERADOR', uppercase: true }
}, { 
    timestamps: true 
});

/**
 * MIDDLEWARE PRE-SAVE: LIMPIEZA Y FORMATEO
 */
eventSchema.pre('validate', function(next) {
    if (this.title) this.title = this.title.toUpperCase();
    if (this.mision) this.mision = this.mision.toUpperCase();
    if (this.elemento) this.elemento = this.elemento.toUpperCase();
    if (this.notasMarginales) this.notasMarginales = this.notasMarginales.toUpperCase();
    if (this.creadorUnidad) this.creadorUnidad = this.creadorUnidad.toUpperCase();
    if (this.unidadApoyada) this.unidadApoyada = this.unidadApoyada.toUpperCase();
    if (this.userName) this.userName = this.userName.toUpperCase();
    
    // Formateo del listado de SDA si existe
    if (this.sdaListado && this.sdaListado.length > 0) {
        this.sdaListado.forEach(item => {
            if (item.sda) item.sda = item.sda.toUpperCase();
        });
    }

    if (this.origen && this.origen.nombre) this.origen.nombre = this.origen.nombre.toUpperCase();
    if (this.destino && this.destino.nombre) this.destino.nombre = this.destino.nombre.toUpperCase();

    next();
});

// Índices optimizados
eventSchema.index({ status: 1 });
eventSchema.index({ elemento: 1, etapa: 1 }); 
eventSchema.index({ creadorUnidad: 1 }); 
eventSchema.index({ createdAt: -1 });
eventSchema.index({ isRealTime: 1 });
eventSchema.index({ mision: 1 });

module.exports = mongoose.model('Event', eventSchema);