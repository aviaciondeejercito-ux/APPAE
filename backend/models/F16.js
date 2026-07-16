const mongoose = require('mongoose');

// Esquema para cada fila de la tabla de componentes
const ComponenteF16Schema = new mongoose.Schema({
    nro: { type: Number, required: true },
    ata: { type: String, required: true }, // Ej: "62-99"
    pn: { type: String, required: true },  // Part Number
    componente: { type: String, required: true }, // Descripción
    sn: { type: String, required: true },  // Serial Number
    limites: {
        tipo: { type: String, default: 'TBO' }, // TBO / Life Limit
        valor: { type: Number, required: true }  // Ej: 2400 (en horas)
    },
    instalado: {
        fecha: { type: Date, required: true }, // Fab/UI (Fecha fabricación o última inspección)
        tiemposCiclos: { type: String, default: 'TSO' }, // TSO, TSN, etc.
        horasInstalacion: { type: Number, default: 0 }, // Ej: 0.0 hs
        tsnCsn: { type: Number, default: 0 } // TSN/CSN al momento de instalar
    },
    tgPlaneador: {
        aInstal: { type: Number, required: true }, // TG Planeador a la instalación (Ej: 2935.7)
        retiroOh: { type: Number, required: true }  // TG Planeador proyectado para retiro (Ej: 5335.7)
    },
    estadoComponente: {
        tiemposCiclos: { type: String, default: 'TSO' }, // TSO acumulado
        actual: { type: Number, required: true },       // Horas acumuladas actuales (Ej: 1094.4)
        disponibilidad: { type: Number, required: true } // Horas remanentes disponibles (Ej: 1305.6)
    }
});

// Esquema Principal F-16
const F16Schema = new mongoose.Schema({
    aeronaveId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Aircraft', 
        required: true 
    },
    matricula: { type: String, required: true }, // Duplicado táctico para búsquedas rápidas
    sda: { type: String, required: true },
    nroSerie: { type: String, required: true },
    
    // Tiempos e historial de incorporación
    inicioAE: {
        fecha: { type: Date, required: true }, // Ej: Feb-12
        horasIniciales: { type: Number, default: 0 } // Ej: 885.7 hs
    },
    
    // TG Planeador (Traído de la Aeronave u otro módulo)
    tgPlaneadorActual: { type: Number, default: 0 }, // Ej: 4030.1 hs
    
    // Grupo Motopropulsor (Motor)
    motor: {
        sn: { type: String, required: true },       // S/N del motor (Ej: CAE-271029)
        tsn: { type: Number, required: true },      // Time Since New (Ej: 2409.4)
        csnCso: { type: Number, required: true }    // Cycles Since New / Overhaul (Ej: 1573)
    },

    // Tabla dinámica de componentes
    componentes: [ComponenteF16Schema],

    creadoPor: { type: String },
    actualizadoPor: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('F16', F16Schema);