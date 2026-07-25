const mongoose = require('mongoose');

const instruccionEscuelaSchema = new mongoose.Schema({
  alumno: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante' },
  fecha: { type: Date, default: Date.now },
  promocion: { type: String, required: true }, // ej: "2026"
  especialidad: { type: String, required: true },
  
  // Evaluaciones Prácticas de Vuelo (Escala 1 a 5)
  competenciasVuelo: {
    procedimientosPreVuelo: { type: Number, min: 1, max: 5 },
    mantenimientoParametros: { type: Number, min: 1, max: 5 },
    procedimientosEmergencia: { type: Number, min: 1, max: 5 },
    navegacionTactica: { type: Number, min: 1, max: 5 },
    aterrizajeVientoCruzado: { type: Number, min: 1, max: 5 }
  },
  horasInstruccion: { type: Number, default: 0 },
  
  // Evaluaciones Académicas (Exámenes/TPs)
  materia: { type: String },
  tipoEvaluacion: { type: String, enum: ['Parcial', 'Trabajo Práctico', 'Final'] },
  notaAcademica: { type: Number, min: 1, max: 10 },

  observaciones: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('InstruccionEscuela', instruccionEscuelaSchema);