const mongoose = require('mongoose');

const RenglonInspeccionSchema = new mongoose.Schema({
    // Snapshot del componente asignado (Solo Lectura)
    componenteRef: { type: String, default: "" },      // ID del componente en la BD
    componenteNombre: { type: String, default: "" },   // P/N - S/N - Nombre
    tgComponente: { type: String, default: "" },       // TG actual al momento / acumulado
    limiteComponente: { type: String, default: "" },   // Límite original del componente
    dispComponente: { type: String, default: "" },     // Disponible original del componente

    // Inspección / Tarea del Programa
    descripcion: { type: String, required: true, trim: true },
    
    // Extensión de criterios
    tipoCriterio: { 
        type: String, 
        enum: ['HORAS', 'FECHA', 'MESES', 'LANDINGS', 'CICLOS'], 
        default: 'HORAS' 
    },
    
    // Valores de Control
    intervaloHs: { type: String, default: "" },
    intervaloMeses: { type: Number, default: 0 },
    intervaloLandings: { type: Number, default: 0 },
    intervaloCiclos: { type: Number, default: 0 },

    // Registros del último cumplimiento
    ultHs: { type: String, default: "" },
    ultFecha: { type: String, default: "" },
    ultLandings: { type: String, default: "" },
    ultCiclos: { type: String, default: "" },
    ultOt: { type: String, default: "" },

    // Próximo Vencimiento / Alerta Personalizada
    proxHs: { type: String, default: "" },
    proxHsManual: { type: Boolean, default: false },
    proxFecha: { type: String, default: "" },
    proxLandings: { type: String, default: "" },
    proxCiclos: { type: String, default: "" },

    responsable: { type: String, default: "Ec AE", trim: true },
    disp: { type: String, default: "" } // Disponible para ESTA inspección
}, { _id: true });

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