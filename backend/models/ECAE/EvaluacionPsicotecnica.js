const mongoose = require('mongoose');

const EvaluacionPsicotecnicaSchema = new mongoose.Schema({
    alumno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tripulante',
        required: true
    },
    especialistaNombre: String,
    aptitud: {
        type: String,
        enum: ['APTO', 'APTO_CON_RESERVAS', 'NO_APTO'],
        default: 'APTO'
    },
    atencionConcentracion: Number,
    toleranciaEstres: Number,
    tomaDecisiones: Number,
    trabajoEnEquipo: Number,
    informeDetallado: String,
    fecha: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('EvaluacionPsicotecnica', EvaluacionPsicotecnicaSchema);