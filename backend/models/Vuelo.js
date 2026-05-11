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
  matricula: { type: String, required: true, trim: true }, // Ej: AE-228

  // --- TRIPULACIÓN (Referencias a la colección Tripulante) ---
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante' },
  piloto: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', required: true },
  copiloto: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante' },
  mecanico: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante' },

  // --- RUTA Y TIEMPOS ---
  desde: { type: String, required: true, uppercase: true }, // Ej: SAVE
  hasta: { type: String, required: true, uppercase: true }, // Ej: SADO
  horasVoladas: { type: Number, required: true }, // Ej: 5.6

  // --- CONDICIONES DE VUELO (Clave para el legajo) ---
  condicion: { 
    type: String, 
    required: true, 
    enum: ['Diurno', 'Nocturno'] 
  },
  reglasVuelo: { 
    type: String, 
    required: true, 
    enum: ['VFR', 'IFR'] 
  },
  usoNVG: { type: Boolean, default: false },

  // --- DETALLES DE LA MISIÓN ---
  tipoMision: { type: String, required: true }, // Ej: Transporte Pers.
  localTravesia: { type: String, enum: ['Local', 'Travesia'] },
  cantidadPasajeros: { type: Number, default: 0 },
  pesoCarga: { type: Number, default: 0 }, // En kg
  elementoApoyado: { type: String, trim: true }, // Ej: Dir AE

  // --- AUDITORÍA ---
  unidadResponsable: { type: String, required: true }, // La unidad que carga el vuelo
  observaciones: { type: String },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Índice para búsquedas rápidas por fecha y aeronave
vueloSchema.index({ fecha: -1, aeronave: 1 });

module.exports = mongoose.model('Vuelo', vueloSchema);