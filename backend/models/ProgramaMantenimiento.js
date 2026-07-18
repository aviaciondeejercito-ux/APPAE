const mongoose = require('mongoose');

// Sub-esquema para estructurar cada renglón de las tablas
const RenglonInspeccionSchema = new mongoose.Schema({
    id: { type: Number, required: true }, // ID temporal de React (Date.now())
    descripcion: { type: String, required: true },
    ultHs: { type: String, default: "" },
    ultFecha: { type: String, default: "" },
    ultOt: { type: String, default: "" },
    proxHs: { type: String, default: "" },
    proxFecha: { type: String, default: "" },
    responsable: { type: String, default: "Ec AE" },
    disp: { type: String, default: "" }
});

const ProgramaMantenimientoSchema = new mongoose.Schema({
    // 🔗 Vincuamos el programa a una Aeronave de tu modelo existente
    aeronaveId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Aircraft', 
        required: true,
        unique: true // Un solo programa activo por aeronave
    },
    tgPlaneadorActual: { type: String, default: "0,0" },
    tgMotorActual: { type: String, default: "0,0" },
    
    // Las dos matrices independientes
    programaPlaneador: [RenglonInspeccionSchema],
    programaMotor: [RenglonInspeccionSchema]
}, { timestamps: true });

module.exports = mongoose.model('ProgramaMantenimiento', ProgramaMantenimientoSchema);