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

  // --- IDENTIKIT: TOTALES ACUMULADOS ---
  totalesHistoricos: {
    vueloDiurno: { type: Number, default: 0 },
    vueloNocturno: { type: Number, default: 0 },
    vueloInstrumental: { type: Number, default: 0 },
    vueloVisual: { type: Number, default: 0 },
    aterrizajes: { type: Number, default: 0 }
  },

  // --- REGISTRO DE CONTROL Y AUDITORÍA ---
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
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- ÍNDICES PARA OPTIMIZACIÓN ---
tripulanteSchema.index({ apellido: 1, unidad: 1 });
tripulanteSchema.index({ "habilitaciones.aeronave": 1 });

// Virtual para ver la experiencia total en años
tripulanteSchema.virtual('antiguedadResumen').get(function() {
  const hoy = new Date();
  if (!this.habilitaciones) return [];
  
  return this.habilitaciones.map(h => {
    let anios = hoy.getFullYear() - h.fechaHabilitacion.getFullYear();
    const mes = hoy.getMonth() - h.fechaHabilitacion.getMonth();
    
    // Ajuste por si aún no cumplió el mes/día del aniversario
    if (mes < 0 || (mes === 0 && hoy.getDate() < h.fechaHabilitacion.getDate())) {
      anios--;
    }
    
    return {
      aeronave: h.aeronave,
      rol: h.rolActual,
      anios: anios < 0 ? 0 : anios // Evita números negativos si la fecha es futura
    };
  });
});

// VIRTUAL: Suma de horas totales a través de todos los sistemas
tripulanteSchema.virtual('totalVueloGeneral').get(function() {
  if (!this.habilitaciones) return 0;
  return this.habilitaciones.reduce((acc, h) => acc + (h.ultimaActividad?.totalHorasSistema || 0), 0);
});

// VIRTUAL: Estado de Vencimientos (útil para alertas en el Frontend)
tripulanteSchema.virtual('estadoCertificaciones').get(function() {
  const hoy = new Date();
  return {
    psicofisicoVencido: this.certificaciones.psicofisico?.vencimiento ? this.certificaciones.psicofisico.vencimiento < hoy : true,
    crmVencido: this.certificaciones.crm?.vencimiento ? this.certificaciones.crm.vencimiento < hoy : true
  };
});

module.exports = mongoose.model('Tripulante', tripulanteSchema);