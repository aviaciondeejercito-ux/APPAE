const mongoose = require('mongoose');

const InstruccionEscuelaSchema = new mongoose.Schema({
    alumnoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tripulante',
        required: true
    },
    alumnoInfo: {
        nombre: String,
        dni: String,
        unidad: String
    },
    modulo: {
        type: String,
        enum: ['vuelo', 'academico', 'psicotecnico', 'fisico'],
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('InstruccionEscuela', InstruccionEscuelaSchema);