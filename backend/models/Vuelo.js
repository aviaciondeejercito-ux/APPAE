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

  // --- TRIPULACIÓN (FLEXIBILIZADA SEGÚN REQUERIMIENTOS MILITARES v3.6) ---
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', default: null },
  piloto: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', default: null }, // CORREGIDO: Se removió 'required: true' para permitir vuelos de Instrucción/Estandarización pura
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
 * HOOK PRE-SAVE: Procesa y acumula las horas de vuelo de manera independiente por rol.
 * ESTÁNDAR: SINCRO JOKER v3.6 (Roles independientes + Consolidación Inteligente Histórica)
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

    // Mapeo de la tripulación preservando la TOTAL independencia de información
    const tripulantesAfectados = [];
    if (this.instructor) tripulantesAfectados.push({ id: this.instructor, rolVuelo: 'Instructor' });
    if (this.piloto) tripulantesAfectados.push({ id: this.piloto, rolVuelo: 'Piloto' });
    if (this.copiloto) tripulantesAfectados.push({ id: this.copiloto, rolVuelo: 'Copiloto' });
    if (this.mecanico) tripulantesAfectados.push({ id: this.mecanico, rolVuelo: 'Mecánico' });
    if (this.segundoMecanico) tripulantesAfectados.push({ id: this.segundoMecanico, rolVuelo: 'Mecánico' });

    for (const t of tripulantesAfectados) {
      const tripulante = await Tripulante.findById(t.id);
      if (!tripulante) continue;

      // BÚSQUEDA CRUZADA INDEPENDIENTE: Buscamos la fila específica de la Aeronave Y el Rol de este registro
      let indexHab = tripulante.habilitaciones.findIndex(h => 
        h.aeronave === SdA && h.rolActual === t.rolVuelo
      );

      // Si no tiene esa combinación creada, se inicializa su registro independiente para este rol
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

      // 1. Sumamos las horas de forma aislada en el casillero del rol ejecutado (Piloto, Instructor o Copiloto)
      if (esVisual) tripulante.habilitaciones[indexHab].hsVisual += hs;
      if (esInstrumental) tripulante.habilitaciones[indexHab].hsInstrumental += hs;
      if (esNocturno && !esNVG) tripulante.habilitaciones[indexHab].hsNocturno += hs;
      if (esNVG) tripulante.habilitaciones[indexHab].hsNVG += hs;

      // Recalculamos el total del SdA para ese rol específico de forma independiente
      tripulante.habilitaciones[indexHab].totalHorasSistema = 
        Number(tripulante.habilitaciones[indexHab].hsVisual || 0) +
        Number(tripulante.habilitaciones[indexHab].hsInstrumental || 0) +
        Number(tripulante.habilitaciones[indexHab].hsNocturno || 0) +
        Number(tripulante.habilitaciones[indexHab].hsNVG || 0);

      // Guardamos la última actividad del rol correspondiente
      tripulante.habilitaciones[indexHab].ultimaActividad = {
        fecha: this.fecha,
        matricula: this.matricula,
        mision: this.tipoMision
      };

      // --- 2. RECALCULO GENERAL DE TOTALES HISTÓRICOS (Consolidación Inteligente por SdA) ---
      const mapaSdA = {};
      
      tripulante.habilitaciones.forEach(hab => {
        const sdaId = hab.aeronave;
        if (!mapaSdA[sdaId]) {
          mapaSdA[sdaId] = { v: 0, i: 0, n: 0, nvg: 0 };
        }
        // Tomamos el valor máximo alcanzado por condición en este sistema de armas
        mapaSdA[sdaId].v = Math.max(mapaSdA[sdaId].v, Number(hab.hsVisual || 0));
        mapaSdA[sdaId].i = Math.max(mapaSdA[sdaId].i, Number(hab.hsInstrumental || 0));
        mapaSdA[sdaId].n = Math.max(mapaSdA[sdaId].n, Number(hab.hsNocturno || 0));
        mapaSdA[sdaId].nvg = Math.max(mapaSdA[sdaId].nvg, Number(hab.hsNVG || 0));
      });

      // Consolidamos los totales limpios sumando los máximos de cada Sistema de Armas diferente
      const totalesLimpios = { v: 0, i: 0, n: 0, nvg: 0 };
      Object.values(mapaSdA).forEach(sistema => {
        totalesLimpios.v += sistema.v;
        totalesLimpios.i += sistema.i;
        totalesLimpios.n += sistema.n;
        totalesLimpios.nvg += sistema.nvg;
      });

      tripulante.totalesHistoricos.vueloDiurno = totalesLimpios.v;
      tripulante.totalesHistoricos.vueloInstrumental = totalesLimpios.i;
      tripulante.totalesHistoricos.vueloNocturno = totalesLimpios.n;
      tripulante.totalesHistoricos.vueloVisual = totalesLimpios.nvg;

      // Guardamos el legajo del tripulante actualizado y consistente
      await tripulante.save();
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Vuelo', vueloSchema);