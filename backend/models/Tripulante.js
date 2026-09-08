const mongoose = require('mongoose');

// Esquema reusable para las certificaciones con fechas de control
const certFechaSchema = new mongoose.Schema({
  ultimaFecha: { type: Date, default: null },
  vencimiento: { type: Date, default: null }
}, { _id: false });

const tripulanteSchema = new mongoose.Schema({
  apellido: { type: String, required: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  grado: { type: String, required: true, trim: true },
  unidad: { type: String, required: true }, 
  elemento: { type: String }, 
  habilitaciones: [{
    aeronave: { type: String },
    fechaHabilitacion: { type: Date },
    rolActual: { type: String },
    hsVisual: { type: Number, default: 0 },
    hsInstrumental: { type: Number, default: 0 },
    hsNocturno: { type: Number, default: 0 },
    hsNVG: { type: Number, default: 0 },
    totalHorasSistema: { type: Number, default: 0 }, 
    historialRoles: [{
      rol: String,
      fechaDesde: Date,
      fechaHasta: Date
    }],
    ultimaActividad: {
      fecha: Date,
      matricula: String,
      mision: String
    },
    fechaBajaHabilitacion: { type: Date },
    observaciones: String
  }],
  capacitacionesEspeciales: [{
    tipo: { type: String },
    fechaAdquisicion: { type: Date },
    horasAcreditadas: { type: Number, default: 0 },
    observaciones: String
  }],
  aptitudesAdicionales: [{
    tipo: { type: String, required: true },
    fechaAdquisicion: { type: Date },
    observaciones: String
  }],
  certificaciones: {
    psicofisico: { type: certFechaSchema, default: {} },
    crm: { type: certFechaSchema, default: {} },
    factoresHumanos: { type: certFechaSchema, default: {} },
    cargasPeligrosas: { type: certFechaSchema, default: {} },
    simulador: { type: certFechaSchema, default: {} }
  },
  totalesHistoricos: {
    vueloDiurno: { type: Number, default: 0 },
    vueloNocturno: { type: Number, default: 0 },
    vueloInstrumental: { type: Number, default: 0 },
    vueloVisual: { type: Number, default: 0 },
    vueloNVG: { type: Number, default: 0 },
    aterrizajes: { type: Number, default: 0 }
  },
  ultimoEditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaUltimaModificacion: { type: Date, default: Date.now },
  activo: { type: Boolean, default: true }
}, { 
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  strict: false 
});

// Virtual inteligente: Calcula el total general de horas acumuladas sumando cada SdA de forma dinámica
tripulanteSchema.virtual('totalVueloGeneral').get(function() {
  if (!this.habilitaciones) return 0;
  return this.habilitaciones.reduce((acc, h) => acc + (h.totalHorasSistema || 0), 0);
});

module.exports = mongoose.model('Tripulante', tripulanteSchema);