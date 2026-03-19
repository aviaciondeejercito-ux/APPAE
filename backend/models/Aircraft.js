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
        trim: true // Elimina espacios accidentales para evitar duplicados falsos
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
        trim: true // CRÍTICO: Asegura coincidencia exacta con el 'elemento' del usuario logueado
    },
    estado: { 
        type: String, 
        required: [true, 'El estado operativo es obligatorio'],
        enum: {
            values: ['E/S', 'F/S'],
            message: '{VALUE} no es un estado válido (Usar E/S para En Servicio o F/S para Fuera de Servicio)'
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
    // Auditoría de cambios en tiempo real
    ultimaActualizacion: { 
        type: Date, 
        default: Date.now 
    },
    actualizadoPor: { 
        type: String,
        default: 'Sistema (Carga Inicial)' 
    },
    // Trazabilidad de origen del dato
    creadoPor: {
        type: String,
        required: [true, 'El registro de autoría es obligatorio para auditoría']
    }
}, { 
    timestamps: true // Crea automáticamente createdAt y updatedAt (Estándar de Seguridad AE)
});

/**
 * MIDDLEWARE DE PRE-GUARDADO (INYECCIÓN DE SEGURIDAD)
 * Asegura la integridad de los datos antes de que lleguen a la base de datos.
 */
AircraftSchema.pre('save', function(next) {
    if (this.matricula) this.matricula = this.matricula.toUpperCase().trim();
    if (this.sda) this.sda = this.sda.toUpperCase().trim();
    if (this.unidad) this.unidad = this.unidad.toUpperCase().trim();
    
    this.ultimaActualizacion = Date.now();
    next();
});

/**
 * ÍNDICES DE RENDIMIENTO Y SEGURIDAD
 * Optimizan las búsquedas frecuentes por Unidad (S4) y Matrícula (Única).
 */
AircraftSchema.index({ unidad: 1 });
AircraftSchema.index({ matricula: 1 }, { unique: true });

module.exports = mongoose.model('Aircraft', AircraftSchema);