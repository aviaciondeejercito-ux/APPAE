const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema({
  fecha: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  usuarioNombre: { type: String, required: true }, 
  
  // CORRECCIÓN: Quitamos el 'required' estricto para evitar bloqueos del sistema
  // Si por alguna razón el token no trae la unidad, la auditoría se guarda igual.
  usuarioUnidad: { type: String }, 
  
  accion: { 
    type: String, 
    enum: ['CREACION', 'MODIFICACION', 'ELIMINACION', 'CARGA_HS', 'PASE_UNIDAD'],
    required: true 
  },
  
  entidadAfectada: {
    type: String, 
    required: true 
  },
  entidadId: {
    type: mongoose.Schema.Types.ObjectId, 
    index: true 
  },

  cambios: {
    anterior: { type: mongoose.Schema.Types.Mixed },
    nuevo: { type: mongoose.Schema.Types.Mixed }
  },
  
  detalles: { type: String, trim: true }, 
  ip: { type: String } 

}, { 
  timestamps: false, 
  versionKey: false 
});

auditoriaSchema.index({ entidadId: 1, fecha: -1 });
auditoriaSchema.index({ usuarioUnidad: 1, fecha: -1 });
auditoriaSchema.index({ usuarioId: 1, fecha: -1 });

module.exports = mongoose.model('Auditoria', auditoriaSchema);