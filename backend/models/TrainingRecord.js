const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
    vueloId: { type: String, required: true },
    vueloFecha: { type: Date, required: true },
    origen: { type: String, required: true },
    destino: { type: String, required: true },
    tripulanteId: { type: String, required: true },
    tripulanteNombre: { type: String, required: true },
    
    procedimientos: {
        // Visual
        despegueNormal: { type: Number, default: 0 },
        despegueMinimaDistancia: { type: Number, default: 0 },
        aterrizajeNormal: { type: Number, default: 0 },
        aterrizajeMinimaDistancia: { type: Number, default: 0 },
        aterrizajeVientoCruzado: { type: Number, default: 0 },
        aterrizajeSinFlaps: { type: Number, default: 0 },
        toqueYMotor: { type: Number, default: 0 },
        circuitoTransitoVisual: { type: Number, default: 0 },
        escapeGoAround: { type: Number, default: 0 },
        
        // IFR
        partidaEstandarizadaIFR: { type: Number, default: 0 },
        arriboEstandarizadoIFR: { type: Number, default: 0 },
        aproxNoPrecision: { type: Number, default: 0 },
        aproxPrecision: { type: Number, default: 0 },
        
        // Nocturno
        despegueNocturno: { type: Number, default: 0 },
        aterrizajeNocturno: { type: Number, default: 0 },
        circuitoTransitoNocturno: { type: Number, default: 0 }
    },
    cargadoPor: { type: String, default: 'Sistema' }
}, { timestamps: true });

module.exports = mongoose.model('TrainingRecord', trainingSchema);