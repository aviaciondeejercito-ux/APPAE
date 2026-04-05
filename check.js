const mongoose = require('mongoose');
require('dotenv').config();

// IMPORTANTE: Ajustamos la ruta según tu estructura de carpetas
// Si tu archivo está en C:\Users\PC\Desktop\APP AE\backend\models\Aircraft.js
const Aircraft = require('./backend/models/Aircraft'); 

const analizarBase = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("Falta MONGO_URI en el archivo .env");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('\n--- 🔍 DIAGNÓSTICO DE FLOTA AE ---');

        const total = await Aircraft.countDocuments();
        const unaMuestra = await Aircraft.findOne();

        if (!unaMuestra) {
            console.log("⚠️ La colección 'aircrafts' está vacía.");
            process.exit(0);
        }

        console.log(`📊 Aeronaves registradas: ${total}`);
        console.log('📄 Ejemplo de documento actual:');
        console.log(JSON.stringify(unaMuestra.toObject(), null, 2));
        
        console.log('\n--- 🛠️ ESTADO DE CAMPOS NUEVOS ---');
        
        // Verificamos qué falta actualizar
        const campos = [
            'horasPlaneador', 
            'motores', 
            'helices', 
            'vencimientoSeguro', 
            'vencimientoRAAC91217', 
            'tipoIcono'
        ];

        const reporte = [];
        for (let campo of campos) {
            const faltantes = await Aircraft.countDocuments({ [campo]: { $exists: false } });
            reporte.push({ Campo: campo, 'Faltan Actualizar': faltantes });
        }

        console.table(reporte);

        console.log('--- ✅ DIAGNÓSTICO FINALIZADO ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
};

analizarBase();