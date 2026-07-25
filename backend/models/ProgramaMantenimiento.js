const mongoose = require('mongoose');

const RenglonInspeccionSchema = new mongoose.Schema({
    // Vinculación opcional con sub-componentes de la BD de la Aeronave
    componenteRef: { type: String, default: "" },
    componenteNombre: { type: String, default: "" },

    descripcion: { type: String, required: true, trim: true },
    tipoCriterio: { 
        type: String, 
        enum: ['HORAS', 'FECHA', 'MESES'], 
        default: 'HORAS' 
    },
    intervaloHs: { type: String, default: "" }, // Aseguramos captura de intervalo en horas
    intervaloMeses: { type: Number, default: 0 },
    ultHs: { type: String, default: "" },
    ultFecha: { type: String, default: "" },
    ultOt: { type: String, default: "" },
    proxHs: { type: String, default: "" },
    proxHsManual: { type: Boolean, default: false }, // Bandera para edición manual
    proxFecha: { type: String, default: "" },
    responsable: { type: String, default: "Ec AE", trim: true },
    disp: { type: String, default: "" }
}, { _id: true }); // Mantiene la generación automática de _id para cada renglón

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
    
    actualizadoPor: { type: String, default: "Sistema" },
    fechaUltimaModificacion: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ProgramaMantenimiento', ProgramaMantenimientoSchema);