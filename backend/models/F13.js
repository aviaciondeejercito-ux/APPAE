const mongoose = require('mongoose');
const { Schema } = mongoose;

const F13Schema = new Schema({
  // Fecha del registro de vuelo
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria.'],
    default: Date.now
  },
  
  // Aeronave vinculada (relación con tu colección de Aeronaves/Material de la unidad)
  aeronave: {
    type: Schema.Types.ObjectId,
    ref: 'Aeronave', // Ajustá al nombre exacto de tu modelo de Aeronaves
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
  
  // Horas Totales (Calculadas: horasALaFecha + horasDelDia)
  horasTotales: {
    type: Number,
    required: [true, 'Las horas totales son obligatorias.'],
    min: [0, 'Las horas no pueden ser negativas.']
  },
  
  // Ciclos acumulados del motor / componentes
  ciclos: {
    type: Number,
    default: 0,
    min: [0, 'Los ciclos no pueden ser negativos.']
  },
  
  // Horas o ciclos acumulados de la APU (Auxiliary Power Unit)
  apu: {
    type: Number,
    default: 0,
    min: [0, 'El valor de APU no puede ser negativo.']
  },
  
  // Cantidad de aterrizajes realizados en el vuelo/día
  aterrizajes: {
    type: Number,
    required: [true, 'La cantidad de aterrizajes es obligatoria.'],
    min: [0, 'Los aterrizajes no pueden ser negativos.'],
    default: 1
  },
  
  // Comandante de Aeronave / Piloto al mando (relación con tu colección de Pilotos/Usuarios)
  comandante: {
    type: Schema.Types.ObjectId,
    ref: 'Piloto', // Ajustá al nombre de tu colección de tripulantes/usuarios
    required: [true, 'El Comandante es obligatorio.']
  },
  
  // Mecánico de a bordo / Motorista (relación con tu colección de Mecánicos/Usuarios)
  mecanico: {
    type: Schema.Types.ObjectId,
    ref: 'Mecanico', // Ajustá según tu modelo de mecánicos o personal técnico
    required: [true, 'El Mecánico es obligatorio.']
  },
  
  // 🌟 Auditoría: Usuario del sistema que cargó este registro
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario', // Ajustá al nombre exacto de tu modelo de usuarios/operadores
    required: [true, 'El usuario que registra el F-13 es obligatorio.']
  },
  
  // --- Estados de Inspección ---
  inspeccionDiaria: {
    realizada: { type: Boolean, default: false },
    firmaResponsable: { type: String, default: '' }, // Puede ser texto o una referencia a un usuario
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
  timestamps: true // Nos genera automáticamente "createdAt" y "updatedAt"
});

// --- MIDDLEWARES / HOOKS ---

// Pre-save hook para calcular automáticamente las horas totales antes de guardar en la DB
F13Schema.pre('save', function(next) {
  if (this.isModified('horasALaFecha') || this.isModified('horasDelDia')) {
    this.horasTotales = Number((this.horasALaFecha + this.horasDelDia).toFixed(2)); // Evita problemas de decimales flotantes en JS
  }
  next();
});

module.exports = mongoose.model('F13', F13Schema);