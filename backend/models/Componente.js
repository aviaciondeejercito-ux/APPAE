import mongoose, { Schema } from 'mongoose';

// 1. Subesquema para Límites (TBO, LL, Inspección, etc.)
const LimiteSchema = new mongoose.Schema({
  valor: { type: String, default: '' }, // ej: "1500", "500", "12"
  unidad: { type: String, default: 'H' } // H (Horas), C (Ciclos), L (Landings), M (Meses)
}, { _id: false });

// 2. Subesquema para Renglones TSN/CSN/Disponibilidades
const ValorUnidadSchema = new mongoose.Schema({
  valor: { type: String, default: '' },
  unidad: { type: String, default: 'H' }
}, { _id: false });

// 3. Subesquema de Historial de Trazabilidad
const HistorialSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  evento: { 
    type: String, 
    enum: ['ALTA_POOL', 'ASIGNACION_UNIDAD', 'MONTAJE_AERONAVE', 'DESMONTAJE_AERONAVE', 'INSPECCION_TALLER', 'BAJA'],
    required: true 
  },
  unidad: { type: String, default: '' },
  aeronaveMatricula: { type: String, default: '' },
  posicion: { type: String, default: '' }, // ej: "Planeador", "Motor 1", "Hélice 2"
  
  // Lecturas snapshot al momento del evento
  hsAeronaveAlMomento: { type: Schema.Types.Mixed, default: '' },
  landingsAeronaveAlMomento: { type: Schema.Types.Mixed, default: '' },
  estadoActualComponente: { type: Schema.Types.Mixed, default: '' },
  
  motivoObservaciones: { type: String, default: '' },
  usuario: { type: String, default: 'Sistema' }
}, { _id: true });

// 4. Esquema Principal de Componente
const ComponenteSchema = new mongoose.Schema({
  // 📌 IDENTIFICACIÓN BÁSICA (Mapeado de tu subesquema original)
  nro: { type: Number, default: 1 },
  ata: { type: String, default: '' }, // Capítulo ATA Spec 100
  pn: { type: String, required: true, trim: true, index: true }, // Part Number
  componente: { type: String, required: true, trim: true }, // Nombre del Componente
  sn: { type: String, required: true, trim: true, unique: true, index: true }, // Serial Number
  
  fechaFabricacion: { type: Date, default: null }, // Fecha de fabricación

  // ⏳ LÍMITES CONFIGURADOS
  limiteTipo: { type: String, default: 'TBO' }, // TBO, LL, OVERHAUL, etc.
  limites: [LimiteSchema],

  // 📊 MANTENIMIENTO Y HORAS ACUMULADAS
  tsnCsnRenglones: [ValorUnidadSchema], // Acumulados totales reales (TSN / CSN)
  estadoTipo: { type: String, default: 'TSO' }, // TSO, TCI, etc.
  estadoActual: { type: Schema.Types.Mixed, default: '' }, // Acumulado parcial o desde último Overhaul
  disponibilidades: [ValorUnidadSchema], // Remanente calculado (Horas/Ciclos restantes)

  // 📍 ESTADO LOGÍSTICO Y UBICACIÓN EN EL GESTOR
  estadoUbicacion: {
    type: String,
    enum: ['POOL_GENERAL', 'ASIGNADO_UNIDAD', 'INSTALADO', 'EN_TALLER', 'BAJA'],
    default: 'POOL_GENERAL',
    index: true
  },
  unidadAsignada: { type: String, default: '', index: true }, // Unidad/Escuadrón que lo reclamó
  aeronaveInstalada: { type: String, default: '', index: true }, // Matrícula (ej: "AE-450")
  posicionMontaje: { type: String, default: '' }, // "compPlaneador", "motores", "helices"

  // ⚓ DATOS BASE DE INSTALACIÓN (Punto cero para el descuento automático de vida útil)
  instaladoFecha: { type: String, default: '' },
  instaladoHoras: { type: Schema.Types.Mixed, default: '' }, // Horas del avión al instalarse
  tgInstalacion: { type: Schema.Types.Mixed, default: '' }, // T.G. del avión al instalarse
  landingsInstalacion: { type: Number, default: 0 }, // Landings/Aterrizajes del avión al instalarse

  // 📜 TRAZABILIDAD COMPLETA
  historial: [HistorialSchema],

  observaciones: { type: String, default: '' },
  creadoPor: { type: String, default: 'Sistema' },
  actualizadoPor: { type: String, default: 'Sistema' }
}, { 
  timestamps: true 
});

export default mongoose.models.Componente || mongoose.model('Componente', ComponenteSchema);