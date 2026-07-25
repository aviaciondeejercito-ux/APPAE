const mongoose = require('mongoose');

const evaluacionPsicotecnicaSchema = new mongoose.Schema({
  alumno: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', required: true },
  fecha: { type: Date, default: Date.now },
  especialista: { type: String, required: true },
  aptitud: { type: String, enum: ['APTO', 'OBSERVADO', 'NO_APTO'], required: true },
  
  // Métricas (1 al 10)
  atencionConcentracion: { type: Number, min: 1, max: 10 },
  toleranciaEstres: { type: Number, min: 1, max: 10 },
  tomaDecisiones: { type: Number, min: 1, max: 10 },
  trabajoEnEquipo: { type: Number, min: 1, max: 10 },
  estabilidadEmocional: { type: Number, min: 1, max: 10 },
  
  informeDetallado: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('EvaluacionPsicotecnica', evaluacionPsicotecnicaSchema);