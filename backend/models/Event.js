const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El título del evento es obligatorio'], 
        trim: true 
    },
    description: { 
        type: String, 
        trim: true 
    },
    start: { 
        type: Date, 
        required: [true, 'La fecha de inicio es obligatoria'] 
    },
    end: { 
        type: Date, 
        required: [true, 'La fecha de fin es obligatoria'] 
    },
    type: { 
        type: String, 
        enum: ['sorteo', 'mantenimiento', 'especial', 'jackpot_run'], 
        default: 'especial' 
    },
    status: { 
        type: String, 
        enum: ['programado', 'en_curso', 'finalizado', 'cancelado'], 
        default: 'programado' 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { timestamps: true });

// Validación de seguridad: La fecha de fin no puede ser anterior a la de inicio
eventSchema.pre('validate', function(next) {
    if (this.end <= this.start) {
        this.invalidate('end', 'La fecha de finalización debe ser posterior a la de inicio');
    }
    next();
});

module.exports = mongoose.model('Event', eventSchema);