const mongoose = require('mongoose');

/**
 * ESQUEMA DE MATERIAL AERONÁUTICO - SISTEMA AE
 * Define la estructura crítica para el seguimiento de horas y estado de flota.
 */
const AircraftSchema = new mongoose.Schema({
    matricula: { 
        type: String, 
        required: [true, 'La matrícula es obligatoria para el registro'], 
        unique: true,
        uppercase: true,
        trim: true 
    },
    sda: { 
        type: String, 
        required: [true, 'Debe especificar el Sistema de Armas (Ej: UH-1H)'],
        uppercase: true,
        trim: true
    },
    unidad: { 
        type: String, 
        required: [true, 'La asignación a una Unidad/Elemento es obligatoria'],
        uppercase: true,
        trim: true 
    },
    estado: { 
        type: String, 
        required: [true, 'El estado operativo es obligatorio'],
        enum: {
            values: ['E/S', 'F/S'],
            message: '{VALUE} no es un estado válido (Usar E/S para En Servicio o F/S para Fuera de Servicio)'
        },
        default: 'E/S' 
    },
    horasRemanentes: { 
        type: Number, 
        required: [true, 'Las horas remanentes son críticas para el cálculo de inspecciones'],
        min: [0, 'Las horas remanentes no pueden ser negativas'],
        default: 0
    },
    // NUEVO: Seguimiento de horas de planeador
    horasPlaneador: {
        type: Number,
        default: 0,
        min: 0
    },
    // NUEVO: Estructuras dinámicas para Motores y Hélices
    motores: [{
        horas: { type: Number, default: 0 },
        fecha: { type: Date }
    }],
    helices: [{
        horas: { type: Number, default: 0 },
        fecha: { type: Date }
    }],
    // NUEVO: Vencimientos técnicos y legales
    vencimientoSeguro: { type: Date },
    vencimientoAvionica: { type: Date },
    vencimientoRAAC91217: { type: Date },
    vencimientoRAAC91411: { type: Date },
    vencimientoRAAC91413: { type: Date },

    novedades: { 
        type: String, 
        default: '', 
        trim: true
    },
    tipoIcono: {
        type: String,
        enum: {
            values: ['ala_rotativa', 'ala_fija'],
            message: '{VALUE} no es un tipo de ícono válido'
        },
        default: 'ala_rotativa'
    },
    ultimaActualizacion: { 
        type: Date, 
        default: Date.now 
    },
    actualizadoPor: { 
        type: String,
        default: 'Sistema (Carga Inicial)' 
    },
    creadoPor: {
        type: String,
        required: [true, 'El registro de autoría es obligatorio para auditoría']
    }
}, { 
    timestamps: true 
});

/**
 * MIDDLEWARE DE PRE-GUARDADO (INYECCIÓN DE SEGURIDAD)
 */
AircraftSchema.pre('save', function(next) {
    if (this.matricula) this.matricula = this.matricula.toUpperCase().trim();
    if (this.sda) this.sda = this.sda.toUpperCase().trim();
    if (this.unidad) this.unidad = this.unidad.toUpperCase().trim();
    
    if (this.novedades === null || this.novedades === undefined) {
        this.novedades = '';
    }

    if (this.tipoIcono) {
        this.tipoIcono = this.tipoIcono.toLowerCase().trim();
    }

    this.ultimaActualizacion = Date.now();
    next();
});

/**
 * ÍNDICES DE RENDIMIENTO Y SEGURIDAD
 */
AircraftSchema.index({ unidad: 1 });
AircraftSchema.index({ matricula: 1 }, { unique: true });

module.exports = mongoose.model('Aircraft', AircraftSchema);