const mongoose = require('mongoose');
const { Schema } = mongoose;

const F13Schema = new Schema({
  // Fecha del registro de vuelo
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria.'],
    default: Date.now
  },
  
  // Aeronave vinculada (Relación con la colección Aircraft)
  aeronave: {
    type: Schema.Types.ObjectId,
    ref: 'Aircraft',
    required: [true, 'La aeronave es obligatoria.']
  },
  
  // Misión de vuelo (ej: Entrenamiento, Apoyo, Traslado, etc.)
  misionVuelo: {
    type: String,
    required: [true, 'La misión de vuelo es obligatoria.'],
    trim: true
  },
  
  // Horas acumuladas antes de este vuelo (Horas a la fecha)
  horasALaFecha: {
    type: Number,
    required: [true, 'Las horas acumuladas a la fecha son obligatorias.'],
    min: [0, 'Las horas no pueden ser negativas.']
  },
  
  // Horas voladas en el día (la jornada/vuelo actual)
  horasDelDia: {
    type: Number,
    required: [true, 'Las horas del día son obligatorias.'],
    min: [0, 'Las horas no pueden ser negativas.']
  },
  
  // Horas Totales (Calculadas automáticamente en el hook pre-save)
  horasTotales: {
    type: Number,
    min: [0, 'Las horas no pueden ser negativas.']
  },

  // Ciclos/Landings acumulados a la fecha (Previos al vuelo)
  ciclosALaFecha: {
    type: Number,
    default: 0,
    min: [0, 'Los ciclos a la fecha no pueden ser negativos.']
  },
  
  // Ciclos del día (consumo de ciclos en el vuelo)
  ciclos: {
    type: Number,
    default: 0,
    min: [0, 'Los ciclos no pueden ser negativos.']
  },

  // Cantidad de aterrizajes realizados en el vuelo/día (Landings)
  aterrizajes: {
    type: Number,
    required: [true, 'La cantidad de aterrizajes es obligatoria.'],
    min: [0, 'Los aterrizajes no pueden ser negativos.'],
    default: 1
  },

  // Ciclos Totales Acumulados (Calculados automáticamente)
  ciclosTotales: {
    type: Number,
    min: [0, 'Los ciclos totales no pueden ser negativos.']
  },
  
  // Horas o ciclos acumulados de la APU (Auxiliary Power Unit)
  apu: {
    type: Number,
    default: 0,
    min: [0, 'El valor de APU no puede ser negativo.']
  },

  // Flag para indicar si es una carga retroactiva/histórica (No incrementa la F-16)
  esHistorico: {
    type: Boolean,
    default: false
  },
  
  // Comandante de Aeronave / Piloto al mando
  comandante: {
    type: String,
    required: [true, 'El Comandante es obligatorio.']
  },
  
  // Mecánico de a bordo / Motorista
  mecanico: {
    type: String,
    required: [true, 'El Mecánico es obligatorio.']
  },
  
  // Auditoría: Usuario del sistema que cargó este registro
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario que registra el F-13 es obligatorio.']
  },
  
  // --- Estados de Inspección ---
  inspeccionDiaria: {
    realizada: { type: Boolean, default: false },
    firmaResponsable: { type: String, default: '' },
    fechaHora: { type: Date }
  },
  
  inspeccionPrevuelo: {
    realizada: { type: Boolean, default: false },
    firmaResponsable: { type: String, default: '' },
    fechaHora: { type: Date }
  },
  
  inspeccionPostvuelo: {
    realizada: { type: Boolean, default: false },
    firmaResponsable: { type: String, default: '' },
    fechaHora: { type: Date }
  }
}, {
  timestamps: true
});

// --- MIDDLEWARES / HOOKS ---

// Pre-save hook para calcular automáticamente las horas y ciclos totales antes de guardar
F13Schema.pre('save', function(next) {
  if (this.isModified('horasALaFecha') || this.isModified('horasDelDia')) {
    this.horasTotales = Number((this.horasALaFecha + this.horasDelDia).toFixed(2));
  }
  if (this.isModified('ciclosALaFecha') || this.isModified('ciclos') || this.isModified('aterrizajes')) {
    const ciclosDelVuelo = this.ciclos || this.aterrizajes || 0;
    this.ciclosTotales = Number((this.ciclosALaFecha + ciclosDelVuelo).toFixed(0));
  }
  next();
});

module.exports = mongoose.model('F13', F13Schema);