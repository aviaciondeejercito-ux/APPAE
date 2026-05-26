const mongoose = require('mongoose');
const Tripulante = require('./Tripulante'); // Requerimos el modelo para impactar las horas

const vueloSchema = new mongoose.Schema({
  fecha: { 
    type: Date, 
    required: true,
    // Forzamos a que la fecha guarde las 00:00:00 exactas de la fecha elegida, evitando desfases horarias
    set: function(val) {
      if (!val) return val;
      if (typeof val === 'string') {
        // Si viene "2026-05-22", tomamos solo el año, mes y día para crear una fecha limpia
        const partes = val.split('T')[0].split('-');
        if (partes.length === 3) {
          return new Date(Date.UTC(partes[0], partes[1] - 1, partes[2], 0, 0, 0));
        }
      }
      return val;
    }
  },
  
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
  observations: { type: String, uppercase: true }, // Mantenido alias por compatibilidad
  observaciones: { type: String, uppercase: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

vueloSchema.index({ fecha: -1, aeronave: 1 });

/**
 * HOOK PRE-SAVE: Procesa y acumula las horas de vuelo en los legajos digitales de forma inteligente.
 * Discrimina la habilitación exacta cruzando la Aeronave con la Función de vuelo real ejercida.
 */
vueloSchema.pre('save', async function(next) {
  // Solo sumamos horas si es un registro de vuelo nuevo
  if (!this.isNew) return next();

  try {
    const hs = Number(this.horasVoladas || 0);
    const SdA = this.aeronave;

    // Desglose de condiciones de vuelo según los campos del formulario
    const esNocturno = this.condicion === 'Nocturno';
    const esInstrumental = this.reglasVuelo === 'IFR';
    const esNVG = this.usoNVG === true;
    const esVisual = !esNocturno && !esInstrumental && !esNVG;

    // Mapeo de la tripulación con su rol exacto en este vuelo
    const tripulantesAfectados = [];
    if (this.instructor) tripulantesAfectados.push({ id: this.instructor, rolVuelo: 'Instructor' });
    if (this.piloto) tripulantesAfectados.push({ id: this.piloto, rolVuelo: 'Piloto' });
    if (this.copiloto) tripulantesAfectados.push({ id: this.copiloto, rolVuelo: 'Copiloto' });
    if (this.mecanico) tripulantesAfectados.push({ id: this.mecanico, rolVuelo: 'Mecánico' });
    if (this.segundoMecanico) tripulantesAfectados.push({ id: this.segundoMecanico, rolVuelo: 'Mecánico' });

    for (const t of tripulantesAfectados) {
      const tripulante = await Tripulante.findById(t.id);
      if (!tripulante) continue;

      // BÚSQUEDA CRUZADA INTELIGENTE: Buscamos la fila que coincida con el Sistema de Armas Y el rol de este vuelo
      let indexHab = tripulante.habilitaciones.findIndex(h => 
        h.aeronave === SdA && h.rolActual === t.rolVuelo
      );

      // Si no tiene esa combinación creada (ej: es su primer vuelo con ese rol en el SdA), la inicializamos
      if (indexHab === -1) {
        tripulante.habilitaciones.push({
          aeronave: SdA,
          rolActual: t.rolVuelo,
          fechaHabilitacion: this.fecha,
          hsVisual: 0,
          hsInstrumental: 0,
          hsNocturno: 0,
          hsNVG: 0,
          totalHorasSistema: 0
        });
        indexHab = tripulante.habilitaciones.length - 1;
      }

      // 1. Sumamos las horas en la habilitación específica del rol ejecutado
      if (esVisual) tripulante.habilitaciones[indexHab].hsVisual += hs;
      if (esInstrumental) tripulante.habilitaciones[indexHab].hsInstrumental += hs;
      if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno += hs;
      if (esNVG) tripulante.habilitaciones[indexHab].hsNVG += hs;

      // Recalculamos el total del SdA para ese rol específico
      tripulante.habilitaciones[indexHab].totalHorasSistema = 
        Number(tripulante.habilitaciones[indexHab].hsVisual || 0) +
        Number(tripulante.habilitaciones[indexHab].hsInstrumental || 0) +
        Number(tripulante.habilitaciones[indexHab].hsNocturno || 0) +
        Number(tripulante.habilitaciones[indexHab].hsNVG || 0);

      // Actualizamos los datos de la última actividad en esa habilitación
      tripulante.habilitaciones[indexHab].ultimaActividad = {
        fecha: this.fecha,
        matricula: this.matricula,
        mision: this.tipoMision
      };

      // 2. RECALCULO GENERAL DE TOTALES HISTÓRICOS: Suma limpia sin duplicar
      const recalculoHistorico = tripulante.habilitaciones.reduce((acc, hab) => {
        acc.v += Number(hab.hsVisual || 0);
        acc.i += Number(hab.hsInstrumental || 0);
        acc.n += Number(hab.hsNocturno || 0);
        acc.nvg += Number(hab.hsNVG || 0);
        return acc;
      }, { v: 0, i: 0, n: 0, nvg: 0 });

      tripulante.totalesHistoricos.vueloDiurno = recalculoHistorico.v;
      tripulante.totalesHistoricos.vueloInstrumental = recalculoHistorico.i;
      tripulante.totalesHistoricos.vueloNocturno = recalculoHistorico.n;
      tripulante.totalesHistoricos.vueloVisual = recalculoHistorico.nvg;

      // Guardamos los cambios en el legajo del tripulante de forma atómica
      await tripulante.save();
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Vuelo', vueloSchema);