const mongoose = require('mongoose');

const CamadaEscuelaSchema = new mongoose.Schema({
    curso: {
        type: String,
        required: true,
        trim: true,
        default: 'Curso Básico de Aviación de Ejército'
    },
    alumnos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tripulante'
    }],
    activa: {
        type: Boolean,
        default: true
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('CamadaEscuela', CamadaEscuelaSchema);