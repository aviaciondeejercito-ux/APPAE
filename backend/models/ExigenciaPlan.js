const mongoose = require('mongoose');

const ExigenciaPlanSchema = new mongoose.Schema({
    piloto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tripulante',
        required: true
    },
    año: {
        type: Number,
        required: true,
        default: 2026
    },
    unidad: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    trimestres: [{
        numero: { type: Number, required: true }, // 1, 2, 3, 4
        rol: { type: String, default: '' },       // Piloto, Copiloto, etc.
        tipo: { type: String, default: '' },      // A, B, C, D
        causaNoCumplimiento: { type: String, default: '' }
    }],
    ultimaActualizacion: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Índice para búsqueda rápida por piloto y año
ExigenciaPlanSchema.index({ piloto: 1, año: 1 }, { unique: true });

module.exports = mongoose.model('ExigenciaPlan', ExigenciaPlanSchema);