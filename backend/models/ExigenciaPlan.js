const mongoose = require('mongoose');

/**
 * MODELO EXIGENCIA PLAN (EBM)
 * Vincula al piloto con sus metas trimestrales.
 */
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
    // Esta estructura guarda la planificación manual que el usuario cargue
    trimestres: [{
        numero: { type: Number, required: true }, // 1, 2, 3, 4
        rol: { type: String, default: '' },       // Piloto, Copiloto, Instructor
        tipo: { type: String, default: '' },      // A, B, C, D
        causaNoCumplimiento: { type: String, default: '' }
    }]
}, { 
    timestamps: true // Para saber cuándo se modificó por última vez
});

// ÍNDICE TÁCTICO: Evita que un piloto tenga dos planes para el mismo año.
ExigenciaPlanSchema.index({ piloto: 1, año: 1 }, { unique: true });

module.exports = mongoose.model('ExigenciaPlan', ExigenciaPlanSchema);