const mongoose = require('mongoose');

const exigenciaPlanSchema = new mongoose.Schema({
    piloto: { type: mongoose.Schema.Types.ObjectId, ref: 'Tripulante', required: true },
    año: { type: Number, required: true, default: new Date().getFullYear() },
    trimestres: [
        {
            numero: { type: Number, enum: [1, 2, 3, 4], required: true },
            rol: { type: String, enum: ['Copiloto', 'Piloto', 'Instructor'], default: 'Copiloto' },
            tipo: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'A' }
        }
    ],
    unidad: { type: String, required: true, uppercase: true }
}, { timestamps: true });

// Índice para buscar rápido el plan de un piloto por año
exigenciaPlanSchema.index({ piloto: 1, año: -1 });

module.exports = mongoose.model('ExigenciaPlan', exigenciaPlanSchema);