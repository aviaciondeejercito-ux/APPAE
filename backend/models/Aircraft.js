const mongoose = require('mongoose');

/**
 * ESQUEMA DE MATERIAL AERONÁUTICO - SISTEMA AE
 * Define la estructura crítica para el seguimiento de horas y estado de flota.
 */
const AircraftSchema = new mongoose.Schema({
    matricula: { 
        type: String, 
        required: [true, 'La matrícula es obligatoria para el registro'], 
        unique: true,
        uppercase: true,
        trim: true // Elimina espacios accidentales
    },
    sda: { 
        type: String, 
        required: [true, 'Debe especificar el Sistema de Armas (Ej: UH-1H)'],
        uppercase: true,
        trim: true
    },
    unidad: { 
        type: String, 
        required: [true, 'La asignación a una Unidad/Elemento es obligatoria'],
        uppercase: true,
        trim: true // Asegura coincidencia exacta con el elemento del usuario S4
    },
    estado: { 
        type: String, 
        enum: {
            values: ['E/S', 'F/S'],
            message: '{VALUE} no es un estado válido (Usar E/S o F/S)'
        },
        default: 'E/S' 
    },
    horasRemanentes: { 
        type: Number, 
        required: [true, 'Las horas remanentes son críticas para el cálculo de inspecciones'],
        min: [0, 'Las horas remanentes no pueden ser negativas'],
        default: 0
    },
    novedades: { 
        type: String, 
        default: 'Sin novedades reportadas.',
        trim: true
    },
    ultimaActualizacion: { 
        type: Date, 
        default: Date.now 
    },
    actualizadoPor: { 
        type: String,
        default: 'Sistema (Carga Inicial)' 
    },
    // Campo de auditoría adicional para trazabilidad total
    creadoPor: {
        type: String
    }
}, { 
    timestamps: true // Crea automáticamente campos createdAt y updatedAt para auditoría técnica
});

// Índice para optimizar las búsquedas por unidad (usado frecuentemente por S4)
AircraftSchema.index({ unidad: 1 });

module.exports = mongoose.model('Aircraft', AircraftSchema);