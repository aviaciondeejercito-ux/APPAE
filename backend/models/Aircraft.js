import mongoose, { Schema } from 'mongoose';

// 1. Subesquema para Límites (TBO, LL, etc.)
const LimiteSchema = new mongoose.Schema({
  valor: { type: String, default: '' },
  unidad: { type: String, default: 'H' }
}, { _id: false });

// 2. Subesquema para Renglones TSN/CSN/Disponibilidades
const ValorUnidadSchema = new mongoose.Schema({
  valor: { type: String, default: '' },
  unidad: { type: String, default: 'H' }
}, { _id: false });

// 3. Subesquema de Componente
const ComponenteSchema = new mongoose.Schema({
  nro: { type: Number, default: 1 },
  ata: { type: String, default: '' },
  pn: { type: String, default: '' },
  componente: { type: String, default: '' },
  sn: { type: String, default: '' },
  
  limiteTipo: { type: String, default: 'TBO' },
  limites: [LimiteSchema],
  
  instaladoFecha: { type: String, default: '' },
  instaladoHoras: { type: Schema.Types.Mixed, default: '' }, // ✅ Ahora Schema está definido
  
  tsnCsnRenglones: [ValorUnidadSchema],
  tgInstalacion: { type: Schema.Types.Mixed, default: '' },
  
  estadoTipo: { type: String, default: 'TSO' },
  estadoActual: { type: Schema.Types.Mixed, default: '' },
  
  disponibilidades: [ValorUnidadSchema]
}, { _id: false });

// 4. Subesquema para Grupo de Motores
const MotorSchema = new mongoose.Schema({
  id: { type: Number, default: 1 },
  nombre: { type: String, default: 'MOTOR Nº 1' },
  componentes: [ComponenteSchema]
}, { _id: false });

// 5. Subesquema para Grupo de Hélices
const HeliceSchema = new mongoose.Schema({
  id: { type: Number, default: 1 },
  nombre: { type: String, default: 'HÉLICE Nº 1' },
  componentes: [ComponenteSchema]
}, { _id: false });

// 6. Esquema Principal de la Aeronave
const AircraftSchema = new mongoose.Schema({
  sda: { type: String, required: true },
  matricula: { type: String, required: true, unique: true, index: true },
  nroSerie: { type: String, default: '' },
  estadoOperativo: { type: String, default: 'E/S' },
  unidad: { type: String, default: '', index: true },

  inicioAeFecha: { type: String, default: '' },
  inicioAeHs: { type: Number, default: 0 },
  tgPlaneadorActual: { type: Number, default: 0 },
  tgPlaneadorLandings: { type: Number, default: 0 },

  motorSn: { type: String, default: '' },
  motorTsn: { type: Number, default: 0 },
  motorCsnCso: { type: Number, default: 0 },
  
  motor2Sn: { type: String, default: '' },
  motor2Tsn: { type: Number, default: 0 },
  motor2CsnCso: { type: Number, default: 0 },
  
  helice1Sn: { type: String, default: '' },
  helice1Tsn: { type: Number, default: 0 },
  
  helice2Sn: { type: String, default: '' },
  helice2Tsn: { type: Number, default: 0 },

  vencimientoElt: { type: String, default: '' },
  vencimientoPitot: { type: String, default: '' },
  vencimientoTransponder: { type: String, default: '' },
  vencimientoSeguro: { type: String, default: '' },
  vencimientoAvionica: { type: String, default: '' },
  observacionesPopup: { type: String, default: '' },

  compPlaneador: [ComponenteSchema],
  motores: [MotorSchema],
  helices: [HeliceSchema],

  creadoPor: { type: String, default: 'Sistema' },
  actualizadoPor: { type: String, default: 'Sistema' }
}, { 
  timestamps: true 
});

export default mongoose.models.Aircraft || mongoose.model('Aircraft', AircraftSchema);