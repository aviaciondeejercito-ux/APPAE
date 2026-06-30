const mongoose = require('mongoose');

/**
 * TrimestreSchema
 * Representa la configuración individual de exigencia para un trimestre y SdA específico.
 * * MATRIZ DE HORAS CORRECTA SEGÚN DIRECTIVA:
 * - Copiloto (CP):       A = 12hs | B = 18hs | C = 15hs | D = 15hs  (Total Anual: 60 hs)
 * - Piloto Comando (PC): A = 20hs | B = 30hs | C = 25hs | D = 25hs  (Total Anual: 100 hs)
 * - Instructor (IE):     A = 24hs | B = 36hs | C = 30hs | D = 30hs  (Total Anual: 120 hs)
 */
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
        uppercase: true,
        required: true
    },
    // Función desempeñada en este trimestre específico:
    // 'PC' = Piloto en Comando, 'CP' = Copiloto, 'IE' = Instructor / Estandarizador
    condicion: { 
        type: String, 
        enum: ['PC', 'CP', 'IE'],
        default: 'CP' 
    },
    // Tipo de trimestre asignado (Columna A de la Directiva):
    // Combinación obligatoria anual sin repetir: 'A', 'B', 'C', 'D'
    tipoEbm: { 
        type: String, 
        enum: ['A', 'B', 'C', 'D'],
        default: 'A' 
    },
    // Horas mínimas requeridas resultantes del cruce exacto de la directiva
    exigenciaHoras: { 
        type: Number, 
        default: 0 
    },
    // Progreso real acumulado para este bloque de tiempo
    hsVoladas: { 
        type: Number, 
        default: 0 
    },
    // Causas o motivos si el trimestre concluyó e ingresó en Bajo Mínimos
    motivoNoCumplimiento: { 
        type: String, 
        default: '' 
    },
    novedadesOtro: { 
        type: String, 
        default: '' 
    }
}, { _id: false }); // Evita generar sub-IDs innecesarios dentro del array

/**
 * ExigenciaPlanSchema
 * Almacena el plan anual consolidado por tripulante.
 */
const ExigenciaPlanSchema = new mongoose.Schema({
    piloto: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tripulante', 
        required: true,
        index: true 
    },
    año: { 
        type: Number, 
        required: true,
        default: 2026
    },
    // Array dinámico que guardará la configuración por cada SdA asignado
    trimestres: [TrimestreSchema],
    ultimaModificacionPor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario' 
    }
}, { 
    timestamps: true 
});

// Índice compuesto para evitar planes redundantes del mismo piloto en el mismo período anual
ExigenciaPlanSchema.index({ piloto: 1, año: 1 }, { unique: true });

module.exports = mongoose.model('ExigenciaPlan', ExigenciaPlanSchema);