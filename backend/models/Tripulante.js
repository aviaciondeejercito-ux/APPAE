const mongoose = require('mongoose');

const tripulanteSchema = new mongoose.Schema({
  // --- IDENTIFICACIÓN BÁSICA ---
  apellido: { type: String, required: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  grado: { type: String, required: true, trim: true },
  unidad: {
    type: String,
    required: true,
    enum: [
      "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
      "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
      "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"
    ]
  },

  // --- HABILITACIONES POR SISTEMA DE ARMAS (ROL Y FUNCIÓN) ---
  habilitaciones: [{
    aeronave: {
      type: String,
      required: true,
      enum: [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
      ]
    },
    fechaHabilitacion: { type: Date, required: true },
    
    // ROL ACTUAL EN ESTE SISTEMA (Agregado 'Inspector' que mencionaste)
    rolActual: {
      type: String,
      enum: ['Mecánico', 'Copiloto', 'Piloto', 'Instructor', 'Normalizador', 'Inspector'],
      required: true
    },
    
    // HISTORIAL DE ROLES EN ESTE SISTEMA (Acumulativo)
    historialRoles: [{
      rol: String,
      fechaDesde: Date,
      fechaHasta: Date
    }],

    ultimaActividad: {
      fecha: Date,
      matricula: String,
      mision: String,
      totalHorasSistema: { type: Number, default: 0 }
    },
    fechaBajaHabilitacion: { type: Date },
    observaciones: String
  }],

  // --- CAPACITACIONES ESPECIALES (ACUMULATIVAS) ---
  capacitacionesEspeciales: [{
    tipo: {
      type: String,
      enum: [
        "Transporte de Personal", "Transporte de Carga", "Sanitario", 
        "Rappel", "Fast Rope", "Carga Externa", "Helibalde", "NVG", 
        "Lanzamiento de Paracaidistas", "Lanzamiento de Carga", 
        "Lanzamiento de Buzos", "Tiro Aereo", "Visual Nocturno", "IFR"
      ]
    },
    fechaAdquisicion: { type: Date, required: true },
    observaciones: String
  }],

  // --- CERTIFICACIONES PERIÓDICAS ---
  certificaciones: {
    psicofisico: {
      ultimaFecha: { type: Date },
      vencimiento: { type: Date }
    },
    crm: {
      ultimaFecha: { type: Date },
      vencimiento: { type: Date }
    }
  },

  // --- IDENTIKIT: TOTALES ACUMULADOS ---
  totalesHistoricos: {
    vueloDiurno: { type: Number, default: 0 },
    vueloNocturno: { type: Number, default: 0 },
    vueloInstrumental: { type: Number, default: 0 },
    vueloVisual: { type: Number, default: 0 },
    aterrizajes: { type: Number, default: 0 }
  },

  // --- REGISTRO DE CONTROL Y AUDITORÍA ---
  // Guarda la referencia al usuario que hizo el último cambio
  ultimoEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaUltimaModificacion: {
    type: Date,
    default: Date.now
  },

  activo: { type: Boolean, default: true }

}, { 
  timestamps: true, // Esto crea createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para ver la experiencia total en años
tripulanteSchema.virtual('antiguedadResumen').get(function() {
  const hoy = new Date();
  if (!this.habilitaciones) return [];
  return this.habilitaciones.map(h => ({
    aeronave: h.aeronave,
    rol: h.rolActual,
    anios: hoy.getFullYear() - h.fechaHabilitacion.getFullYear()
  }));
});

module.exports = mongoose.model('Tripulante', tripulanteSchema);