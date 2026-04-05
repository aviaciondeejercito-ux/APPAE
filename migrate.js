const mongoose = require('mongoose');
require('dotenv').config();

// Ruta confirmada por el diagnóstico previo
const Aircraft = require('./backend/models/Aircraft');

const ejecutarMigracion = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error("Falta MONGO_URI en .env");

        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conexión establecida. Iniciando actualización de 43 aeronaves...');

        // Usamos bulkWrite para que la operación sea rápida y eficiente
        const aircrafts = await Aircraft.find({});
        
        const operaciones = aircrafts.map(doc => {
            return {
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $set: {
                            // Si no tiene horas de planeador, inicializa en 0
                            horasPlaneador: doc.horasPlaneador || 0,
                            
                            // Inicializa arrays técnicos si no existen o son nulos
                            motores: (doc.motores && Array.isArray(doc.motores)) ? doc.motores : [],
                            helices: (doc.helices && Array.isArray(doc.helices)) ? doc.helices : [],

                            // Inicializa fechas de vencimiento (RAAC y Seguros)
                            vencimientoSeguro: doc.vencimientoSeguro || null,
                            vencimientoAvionica: doc.vencimientoAvionica || null,
                            vencimientoRAAC91217: doc.vencimientoRAAC91217 || null,
                            vencimientoRAAC91411: doc.vencimientoRAAC91411 || null,
                            vencimientoRAAC91413: doc.vencimientoRAAC91413 || null,

                            // Auditoría de sistema
                            actualizadoPor: 'SISTEMA (Migración Técnica)',
                            ultimaActualizacion: Date.now()
                        }
                    }
                }
            };
        });

        if (operaciones.length > 0) {
            const resultado = await Aircraft.bulkWrite(operaciones);
            console.log(`🚀 Éxito: ${resultado.modifiedCount} aeronaves actualizadas.`);
        } else {
            console.log('⚠️ No se encontraron documentos para actualizar.');
        }

        console.log('--- ✅ MIGRACIÓN FINALIZADA ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR CRÍTICO:', error.message);
        process.exit(1);
    }
};

ejecutarMigracion();