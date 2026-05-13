const mongoose = require('mongoose');

const ExigenciaPlanSchema = new mongoose.Schema({
    piloto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tripulante',
        required: true
    },
    año: { type: Number, required: true },
    unidad: { type: String, required: true, uppercase: true },
    trimestres: [{
        numero: Number,
        rol: String,
        tipo: String,
        causaNoCumplimiento: String
    }]
}, { timestamps: true });

// Índice para evitar duplicados
ExigenciaPlanSchema.index({ piloto: 1, año: 1 }, { unique: true });

module.exports = mongoose.model('ExigenciaPlan', ExigenciaPlanSchema);