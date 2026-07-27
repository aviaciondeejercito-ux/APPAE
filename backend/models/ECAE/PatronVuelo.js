const mongoose = require('mongoose');

const EstandarSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, // Ej: "Mantenimiento de Altitud", "Checklist Pre-Despegue"
    descripcion: { type: String, default: '' },
    orden: { type: Number, default: 0 }
});

const PatronVueloSchema = new mongoose.Schema({
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true }, // Ej: "PV-01", "NOCT-02"
    nombre: { type: String, required: true, trim: true }, // Ej: "Fase de Transición Básica"
    descripcion: { type: String, default: '' },
    aeronaveTipo: { type: String, default: 'GENERAL' }, // Ej: "BELL-206", "UH-1H", "GENERAL"
    estandares: [EstandarSchema],
    activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PatronVuelo', PatronVueloSchema);