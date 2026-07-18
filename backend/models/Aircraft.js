const mongoose = require('mongoose');

/**
 * ESQUEMA PARA SUB-RENGLONES DE MÉTRICAS (Horas, Meses, Ciclos)
 */
const MetricValueSchema = new mongoose.Schema({
    valor: { 
        type: String, 
        default: '' 
    },
    unidad: { 
        type: String, 
        enum: ['H', 'M', 'C'], 
        default: 'H' 
    }
}, { _id: false });

/**
 * ESQUEMA REUTILIZABLE PARA COMPONENTES DE ALTA TRAZABILIDAD
 */
const ComponentSchema = new mongoose.Schema({
    nro: { type: Number, required: true },
    ata: { type: String, default: '', trim: true },
    pn: { type: String, default: '', trim: true },
    componente: { type: String, default: '', trim: true },
    sn: { type: String, default: '', trim: true },
    limiteTipo: { type: String, enum: ['TBO', 'LL'], default: 'TBO' },
    
    // Sub-renglones dinámicos del panel nuevo
    limites: [MetricValueSchema],
    tsnCsnRenglones: [MetricValueSchema],
    disponibilidades: [MetricValueSchema],
    
    instaladoFecha: { type: String, default: '' }, 
    instaladoHoras: { type: Number, default: 0 },
    tgInstalacion: { type: Number, default: 0 },
    estadoTipo: { type: String, enum: ['TSO', 'TSHMI', 'TSN'], default: 'TSO' },
    estadoActual: { type: Number, default: 0 }
}, { _id: false });

/**
 * ESQUEMA PARA NODOS DE PROPULSIÓN DINÁMICOS (Motores y Hélices)
 */
const PropulsionGroupSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    nombre: { type: String, required: true, uppercase: true, trim: true }, 
    componentes: [ComponentSchema]
}, { _id: false });

/**
 * ESQUEMA PRINCIPAL DE AERONAVE (Estructura Unificada de Cabecera y Tablas)
 */
const AircraftSchema = new mongoose.Schema({
    // DATOS DE CABECERA
    matricula: { 
        type: String, 
        required: [true, 'La matrícula es obligatoria'], 
        unique: true,
        uppercase: true,
        trim: true 
    },
    sda: { 
        type: String, 
        required: [true, 'El Sistema de Armas es obligatorio'],
        uppercase: true,
        trim: true
    },
    nroSerie: { type: String, default: '', trim: true },
    unidad: { 
        type: String, 
        required: [true, 'La asignación a una Unidad/Elemento es obligatoria'],
        uppercase: true,
        trim: true 
    },
    estadoOperativo: { 
        type: String, 
        enum: ['E/S', 'F/S'],
        default: 'E/S' 
    },
    
    // TIEMPOS E HISTORIAL
    inicioAeFecha: { type: String, default: '' },
    inicioAeHs: { type: Number, default: 0 },
    tgPlaneadorActual: { type: Number, default: 0 },

    // 🛠️ GRUPO MOTOPROPULSOR (CAMPOS DE CABECERA AGREGADOS PARA SINCRONIZACIÓN)
    motorSn: { type: String, default: '', trim: true },
    motorTsn: { type: Number, default: 0 },
    motorCsnCso: { type: Number, default: 0 },

    // REQUISITOS LEGALES & VENCIMIENTOS
    vencimientoElt: { type: Date },
    vencimientoPitot: { type: Date },
    vencimientoTransponder: { type: Date },
    vencimientoSeguro: { type: Date },
    vencimientoAvionica: { type: Date },
    observacionesPopup: { type: String, default: '', trim: true },

    // ESTRUCTURAS DE COMPONENTES ASOCIADOS (TABLAS DINÁMICAS)
    compPlaneador: [ComponentSchema],
    motores: [PropulsionGroupSchema],
    helices: [PropulsionGroupSchema],

    // AUDITORÍA INTERNA
    tipoIcono: {
        type: String,
        enum: ['ala_rotativa', 'ala_fija'],
        default: 'ala_rotativa'
    },
    creadoPor: { type: String, required: true },
    actualizadoPor: { type: String }
}, { 
    timestamps: true 
});

// Middleware de normalización pre-guardado
AircraftSchema.pre('save', function(next) {
    if (this.matricula) this.matricula = this.matricula.toUpperCase().trim();
    if (this.sda) this.sda = this.sda.toUpperCase().trim();
    if (this.unidad) this.unidad = this.unidad.toUpperCase().trim();
    next();
});

AircraftSchema.index({ unidad: 1 });
AircraftSchema.index({ sda: 1 });

module.exports = mongoose.model('Aircraft', AircraftSchema);