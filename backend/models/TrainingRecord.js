const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
    vueloId: { 
        type: String, 
        required: [true, 'El ID del vuelo es obligatorio'] 
    },
    vueloFecha: { 
        type: Date, 
        required: [true, 'La fecha del vuelo es obligatoria'] 
    },
    // Se cambia required por default para evitar colapsos si no se envía la ruta
    origen: { 
        type: String, 
        default: 'S/D',
        trim: true 
    },
    destino: { 
        type: String, 
        default: 'S/D',
        trim: true 
    },
    tripulanteId: { 
        type: String, 
        required: [true, 'El ID del tripulante es obligatorio'] 
    },
    tripulanteNombre: { 
        type: String, 
        required: [true, 'El nombre del tripulante es obligatorio'] 
    },
    
    procedimientos: {
        // Exigencias Visuales
        despegueNormal: { type: Number, default: 0, min: 0 },
        despegueMinimaDistancia: { type: Number, default: 0, min: 0 },
        aterrizajeNormal: { type: Number, default: 0, min: 0 },
        aterrizajeMinimaDistancia: { type: Number, default: 0, min: 0 },
        aterrizajeVientoCruzado: { type: Number, default: 0, min: 0 },
        aterrizajeSinFlaps: { type: Number, default: 0, min: 0 },
        toqueYMotor: { type: Number, default: 0, min: 0 },
        circuitoTransitoVisual: { type: Number, default: 0, min: 0 },
        escapeGoAround: { type: Number, default: 0, min: 0 },
        
        // Exigencias IFR
        partidaEstandarizadaIFR: { type: Number, default: 0, min: 0 },
        arriboEstandarizadoIFR: { type: Number, default: 0, min: 0 },
        aproxNoPrecision: { type: Number, default: 0, min: 0 },
        aproxPrecision: { type: Number, default: 0, min: 0 },
        
        // Exigencias Nocturnas
        despegueNocturno: { type: Number, default: 0, min: 0 },
        aterrizajeNocturno: { type: Number, default: 0, min: 0 },
        circuitoTransitoNocturno: { type: Number, default: 0, min: 0 }
    },
    cargadoPor: { 
        type: String, 
        default: 'Sistema' 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('TrainingRecord', trainingSchema);