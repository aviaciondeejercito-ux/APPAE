const mongoose = require('mongoose');

const TrimestreSchema = new mongoose.Schema({
    numero: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 4 
    },
    sistemaArmas: { 
        type: String, 
        trim: true, 
        uppercase: true 
    },
    // Sincronizado con el Frontend (Copiloto, Piloto, Instructor)
    condicion: { 
        type: String, 
        default: 'Copiloto' 
    },
    // Sincronizado con el Frontend (Tipo A, B, C, D)
    tipoEbm: { 
        type: String, 
        default: 'A' 
    },
    exigenciaHoras: { 
        type: Number, 
        default: 0 
    },
    hsVoladas: { 
        type: Number, 
        default: 0 
    },
    // Sincronizado con el selector de motivos obligatorios del Frontend
    motivoNoCumplimiento: { 
        type: String, 
        default: '' 
    },
    novedadesOtro: { 
        type: String, 
        default: '' 
    }
}, { _id: false }); // _id: false porque es un subdocumento embebido

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

module.exports = mongoose.model('ExigenciaPlan', ExigenciaPlanSchema);