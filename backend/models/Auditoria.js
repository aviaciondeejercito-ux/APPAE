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
  
  // Mantenemos la flexibilidad que pediste
  usuarioUnidad: { type: String }, 
  
  accion: { 
    type: String, 
    // Agregamos 'LOGIN' y 'LOGOUT' por si los necesitas luego, mantenemos los tuyos
    enum: ['CREACION', 'MODIFICACION', 'ELIMINACION', 'CARGA_HS', 'PASE_UNIDAD', 'LOGIN', 'LOGOUT'],
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

  // CAMBIO CRÍTICO: Definimos cambios como Mixed directamente para máxima flexibilidad
  cambios: { type: mongoose.Schema.Types.Mixed },
  
  detalles: { type: String, trim: true }, 
  ip: { type: String } 

}, { 
  timestamps: false, 
  versionKey: false 
});

// Índices para que las búsquedas de los jefes sean rápidas
auditoriaSchema.index({ entidadId: 1, fecha: -1 });
auditoriaSchema.index({ usuarioUnidad: 1, fecha: -1 });
auditoriaSchema.index({ usuarioId: 1, fecha: -1 });

module.exports = mongoose.model('Auditoria', auditoriaSchema);