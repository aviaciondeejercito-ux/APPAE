const mongoose = require('mongoose');

/**
 * MODELO DE AUDITORÍA - SISTEMA GESTIÓN AE
 * Registro inmutable de movimientos, cambios de horas y seguridad.
 */

const auditoriaSchema = new mongoose.Schema({
  fecha: { 
    type: Date, 
    default: Date.now,
    index: true // Optimiza reportes por rango de fechas
  },
  
  // DATOS DEL ACTOR (Quién realizó la acción)
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  usuarioNombre: { type: String, required: true }, // Ej: "Capitan GOMEZ"
  usuarioUnidad: { type: String, required: true }, // Ej: "B HELIC ASAL 601"
  
  // DATOS DE LA ACCIÓN
  accion: { 
    type: String, 
    enum: ['CREACION', 'MODIFICACION', 'ELIMINACION', 'CARGA_HS', 'PASE_UNIDAD'],
    required: true 
  },
  
  // DATOS DEL AFECTADO (Sobre quién se realizó la acción)
  entidadAfectada: {
    type: String, 
    required: true // Ej: "Tripulante: My PEREZ"
  },
  entidadId: {
    type: mongoose.Schema.Types.ObjectId, // ID del Tripulante para historial individual
    index: true 
  },

  // REGISTRO DE CAMBIOS (Estructura flexible para el "Antes" y "Después")
  cambios: {
    anterior: { type: mongoose.Schema.Types.Mixed },
    nuevo: { type: mongoose.Schema.Types.Mixed }
  },
  
  detalles: { type: String, trim: true }, // Notas adicionales
  ip: { type: String } 

}, { 
  timestamps: false, // La fecha ya es el registro temporal
  versionKey: false  // No necesitamos el __v en auditoría
});

// --- ÍNDICES COMPUESTOS ---
// 1. Para ver todo el historial de cambios de un tripulante específico (cronológico inverso)
auditoriaSchema.index({ entidadId: 1, fecha: -1 });

// 2. Para ver qué hizo una unidad específica en un periodo de tiempo
auditoriaSchema.index({ usuarioUnidad: 1, fecha: -1 });

// 3. Para auditoría por usuario (Quién tocó qué)
auditoriaSchema.index({ usuarioId: 1, fecha: -1 });

module.exports = mongoose.model('Auditoria', auditoriaSchema);