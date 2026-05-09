const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema({
  fecha: { 
    type: Date, 
    default: Date.now,
    index: true // Indexamos la fecha para que las búsquedas históricas sean rápidas
  },
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  usuarioNombre: String, // Ejemplo: "Subof Pr GOMEZ"
  usuarioUnidad: String, // IMPORTANTE: Para saber desde qué unidad se hizo el cambio
  
  accion: { 
    type: String, 
    enum: ['CREACION', 'MODIFICACION', 'ELIMINACION', 'CARGA_HS', 'PASE_UNIDAD'] 
  },
  
  entidadAfectada: {
    type: String, 
    required: true // Ej: "Tripulante: My PEREZ"
  },
  
  // Guardamos el ID del tripulante afectado por si necesitamos filtrar su historial
  entidadId: {
    type: mongoose.Schema.Types.ObjectId
  },

  cambios: {
    anterior: { type: Object },
    nuevo: { type: Object }
  },
  
  detalles: String, // Para poner notas como "Se actualizó INMAE" o "Error de carga"
  ip: String 

}, { 
  timestamps: false // No necesitamos updatedAt porque la auditoría es inmutable
});

// Índice compuesto para buscar rápido todos los cambios hechos a un piloto específico
auditoriaSchema.index({ entidadId: 1, fecha: -1 });

module.exports = mongoose.model('Auditoria', auditoriaSchema);