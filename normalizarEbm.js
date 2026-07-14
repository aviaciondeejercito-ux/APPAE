// Carga las variables de entorno de tu archivo .env
require('dotenv').config();
const mongoose = require('mongoose');

// Usa la URI real de tu .env o cae en los puertos estándar de MongoDB si no existe
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tu_base_de_datos';

async function normalizarDirecto() {
    try {
        console.log(`🔌 Conectando a MongoDB en: ${MONGO_URI.split('@').pop()}...`); // Oculta usuario/password si los hay
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conexión establecida con éxito.');

        // Accedemos directamente a la colección cruda de la base de datos
        const coleccion = mongoose.connection.collection('exigenciaplans');

        // Contamos cuántos documentos tienen el problema
        const afectados = await coleccion.countDocuments({ 
            'trimestres.condicion': 'Piloto' 
        });

        console.log(`🔍 Registros inconsistentes encontrados: ${afectados}`);

        if (afectados === 0) {
            console.log('✅ ¡Excelente! No se encontraron registros con la condición "Piloto". Todo está limpio.');
            return;
        }

        // Ejecutamos la corrección segura
        const resultado = await coleccion.updateMany(
            { 'trimestres.condicion': 'Piloto' },
            { $set: { 'trimestres.$[elem].condicion': 'CP' } },
            { arrayFilters: [{ 'elem.condicion': 'Piloto' }] }
        );

        console.log('⚡ ¡Proceso completado!');
        console.log(`- Documentos identificados: ${resultado.matchedCount}`);
        console.log(`- Documentos corregidos exitosamente: ${resultado.modifiedCount}`);

    } catch (error) {
        console.error('❌ Error durante la normalización:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Conexión cerrada de forma segura.');
    }
}

normalizarDirecto();