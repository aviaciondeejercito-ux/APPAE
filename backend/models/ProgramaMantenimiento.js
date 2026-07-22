const mongoose = require('mongoose');

const RenglonInspeccionSchema = new mongoose.Schema({
    descripcion: { type: String, required: true, trim: true },
    tipoCriterio: { 
        type: String, 
        enum: ['HORAS', 'FECHA', 'MESES'], 
        default: 'HORAS' 
    },
    intervaloMeses: { type: Number, default: 0 }, // Para cálculo automático mensual
    ultHs: { type: String, default: "" },
    ultFecha: { type: String, default: "" },
    ultOt: { type: String, default: "" },
    proxHs: { type: String, default: "" },
    proxFecha: { type: String, default: "" },
    responsable: { type: String, default: "Ec AE", trim: true },
    disp: { type: String, default: "" }
});

const ProgramaMantenimientoSchema = new mongoose.Schema({
    aeronaveId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Aircraft', 
        required: true,
        unique: true 
    },
    tgPlaneadorActual: { type: String, default: "0,0" },
    tgMotorActual: { type: String, default: "0,0" },
    tgMotor2Actual: { type: String, default: "0,0" },
    tgHeliceActual: { type: String, default: "0,0" },
    tgHelice2Actual: { type: String, default: "0,0" },
    
    programaPlaneador: [RenglonInspeccionSchema],
    programaMotor: [RenglonInspeccionSchema],
    programaMotor2: [RenglonInspeccionSchema],
    programaHelice: [RenglonInspeccionSchema],
    programaHelice2: [RenglonInspeccionSchema],
    
    actualizadoPor: { type: String, default: "Sistema" }
}, { timestamps: true });

module.exports = mongoose.model('ProgramaMantenimiento', ProgramaMantenimientoSchema);