const mongoose = require('mongoose');

const RenglonInspeccionSchema = new mongoose.Schema({
    id: { type: Number, required: true }, 
    descripcion: { type: String, required: true, trim: true },
    ultHs: { type: String, default: "" },
    ultFecha: { type: String, default: "" },
    ultOt: { type: String, default: "" },
    proxHs: { type: String, default: "" },
    proxFecha: { type: String, default: "" },
    responsable: { type: String, default: "Ec AE", trim: true },
    disp: { type: String, default: "" }
}, { _id: false });

const ProgramaMantenimientoSchema = new mongoose.Schema({
    aeronaveId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Aircraft', 
        required: true,
        unique: true 
    },
    tgPlaneadorActual: { type: String, default: "0,0" },
    tgMotorActual: { type: String, default: "0,0" },
    
    programaPlaneador: [RenglonInspeccionSchema],
    programaMotor: [RenglonInspeccionSchema],
    
    actualizadoPor: { type: String, default: "Sistema" }
}, { timestamps: true });

module.exports = mongoose.model('ProgramaMantenimiento', ProgramaMantenimientoSchema);