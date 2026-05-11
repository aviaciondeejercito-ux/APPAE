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

  // --- HABILITACIONES POR SISTEMA DE ARMAS ---
  habilitaciones: [{
    aeronave: {
      type: String,
      required: true,
      enum: [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", 
        "AB206B3", "T-34C1", "T-6C", "C-207", "EMB-312", "G-120TP-A", "P-2002"
      ]
    },
    fechaHabilitacion: { type: Date, required: true },
    rolActual: {
      type: String,
      enum: ['Cursante','Mecánico', 'Copiloto', 'Piloto', 'Instructor', 'Normalizador', 'Inspector'],
      required: true
    },

    // --- ACUMULADOS POR SISTEMA (Esto es lo que te faltaba) ---
    // Estos campos deben estar aquí para que el Label los pueda leer
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
      // totalHorasSistema se movió un nivel arriba para mayor claridad
    },
    fechaBajaHabilitacion: { type: Date },
    observaciones: String
  }],

  // --- CAPACITACIONES ESPECIALES ---
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

  // --- IDENTIKIT: TOTALES ACUMULADOS GENERALES ---
  totalesHistoricos: {
    vueloDiurno: { type: Number, default: 0 },
    vueloNocturno: { type: Number, default: 0 },
    vueloInstrumental: { type: Number, default: 0 },
    vueloVisual: { type: Number, default: 0 },
    aterrizajes: { type: Number, default: 0 }
  },

  ultimoEditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaUltimaModificacion: { type: Date, default: Date.now },
  activo: { type: Boolean, default: true }

}, { 
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- ÍNDICES ---
tripulanteSchema.index({ apellido: 1, unidad: 1 });
tripulanteSchema.index({ "habilitaciones.aeronave": 1 });

// VIRTUAL: Antigüedad
tripulanteSchema.virtual('antiguedadResumen').get(function() {
  const hoy = new Date();
  if (!this.habilitaciones) return [];
  return this.habilitaciones.map(h => {
    let anios = hoy.getFullYear() - h.fechaHabilitacion.getFullYear();
    const mes = hoy.getMonth() - h.fechaHabilitacion.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < h.fechaHabilitacion.getDate())) anios--;
    return { aeronave: h.aeronave, rol: h.rolActual, anios: anios < 0 ? 0 : anios };
  });
});

// VIRTUAL: Suma de horas totales (Ajustado a la nueva ubicación del campo)
tripulanteSchema.virtual('totalVueloGeneral').get(function() {
  if (!this.habilitaciones) return 0;
  return this.habilitaciones.reduce((acc, h) => acc + (h.totalHorasSistema || 0), 0);
});

// VIRTUAL: Estado de Vencimientos
tripulanteSchema.virtual('estadoCertificaciones').get(function() {
  const hoy = new Date();
  return {
    psicofisicoVencido: this.certificaciones.psicofisico?.vencimiento ? this.certificaciones.psicofisico.vencimiento < hoy : true,
    crmVencido: this.certificaciones.crm?.vencimiento ? this.certificaciones.crm.vencimiento < hoy : true
  };
});

module.exports = mongoose.model('Tripulante', tripulanteSchema);