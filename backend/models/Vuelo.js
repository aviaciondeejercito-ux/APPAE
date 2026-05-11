const mongoose = require('mongoose');

const vueloSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  
  // --- AERONAVE ---
  aeronave: { 
    type: String, 
    required: true,
    enum: [
      "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
      "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", 
      "AB206B3", "T-34C1", "T-6C", "C-207", "EMB-312", "G-120TP-A", "P-2002"
    ]
  },
  matricula: { type: String, required: true, trim: true, uppercase: true },

  // --- TRIPULACIÓN ---
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', default: null },
  piloto: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', required: true },
  copiloto: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', default: null },
  mecanico: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', default: null },
  segundoMecanico: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', default: null },

  // --- RUTA Y TIEMPOS ---
  desde: { type: String, required: true, uppercase: true }, 
  hasta: { type: String, required: true, uppercase: true }, 
  horasVoladas: { type: Number, required: true },

  // --- CONDICIONES DE VUELO ---
  condicion: { 
    type: String, 
    required: true, 
    enum: ['Diurno', 'Nocturno'] 
  },
  reglasVuelo: { 
    type: String, 
    required: true, 
    enum: ['VFR', 'IFR'],
    default: 'VFR'
  },
  usoNVG: { type: Boolean, default: false },

  // --- DETALLES DE LA MISIÓN ---
  tipoMision: { type: String, required: true }, 
  localTravesia: { type: String, enum: ['Local', 'Travesia'], default: 'Local' },
  cantidadPasajeros: { type: Number, default: 0 },
  pesoCarga: { type: Number, default: 0 }, 
  elementoApoyado: { type: String, trim: true, uppercase: true }, 

  // --- AUDITORÍA ---
  unidadResponsable: { type: String, required: true, uppercase: true }, 
  observaciones: { type: String, uppercase: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

vueloSchema.index({ fecha: -1, aeronave: 1 });

module.exports = mongoose.model('Vuelo', vueloSchema);