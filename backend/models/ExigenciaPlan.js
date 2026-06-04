const mongoose = require('mongoose');

const TrimestreSchema = new mongoose.Schema({
    numero: { type: Number, required: true, min: 1, max: 4 },
    sistemaArmas: { type: String, trim: true, uppercase: true },
    rol: { type: String, default: '' },
    tipo: { type: String, default: '' },
    exigenciaHoras: { type: Number, default: 0 },
    causaNoCumplimiento: { type: String, default: '' },
    novedadesOtro: { type: String, default: '' }
}, { _id: false }); // _id: false porque es un subdocumento

const ExigenciaPlanSchema = new mongoose.Schema({
    piloto: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tripulante', 
        required: true,
        index: true // Índice para búsquedas rápidas en el controlador
    },
    año: { 
        type: Number, 
        required: true,
        default: 2026
    },
    trimestres: [TrimestreSchema],
    ultimaModificacionPor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario' 
    }
}, { 
    timestamps: true 
});

// Índice compuesto para evitar planes duplicados del mismo piloto en el mismo año
ExigenciaPlanSchema.index({ piloto: 1, año: 1 }, { unique: true });

// Exportación segura: usa el modelo existente si ya fue compilado, sino lo crea.
// Esto evita el error "OverwriteModelError"
module.exports = mongoose.models.ExigenciaPlan || mongoose.model('ExigenciaPlan', ExigenciaPlanSchema);