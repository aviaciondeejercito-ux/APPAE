const mongoose = require('mongoose');

// REEMPLAZA ESTO con tu URI de Atlas
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

const runMigration = async () => {
    try {
        console.log("🛠️  Iniciando normalización de base de datos (Estructura Pecera Estanca)...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conexión establecida con MongoDB Atlas.");

        const db = mongoose.connection.db;
        const collection = db.collection('events');

        // Obtenemos todos los eventos para procesarlos uno por uno
        const events = await collection.find({}).toArray();
        console.log(`📦 Se encontraron ${events.length} eventos para revisar.`);

        let modificados = 0;

        for (let ev of events) {
            // 1. Determinar el elemento y creador
            const elementoFinal = (ev.elemento || ev.ubicacion?.elemento || "POR CLASIFICAR").toUpperCase();
            const creadorFinal = (ev.creadorUnidad || elementoFinal).toUpperCase();
            
            // 2. Lógica Crítica de esGlobal: 
            // Solo debe ser Global si el creador es de la DIR AE / SEC AE. 
            // Si el evento pertenece a una unidad específica, esGlobal debe ser false para que no se filtre erróneamente.
            let esGlobalFinal = false;
            if (creadorFinal.includes('DIR AE') || creadorFinal.includes('SEC AE') || ev.esGlobal === true) {
                esGlobalFinal = true;
            }

            const repair = {
                // 1. Campos de Identificación y Jerarquía
                elemento: elementoFinal,
                creadorUnidad: creadorFinal,
                etapa: (ev.etapa || ev.ubicacion?.etapa || "recepcion").toLowerCase(),
                tipoOrigen: ev.tipoOrigen || ev.ubicacion?.tipoOrigen || "MIGRACION",
                esGlobal: esGlobalFinal,
                
                // 2. Datos de Misión
                sdaListado: Array.isArray(ev.sdaListado) ? ev.sdaListado : [],
                tipoApoyo: (ev.tipoApoyo || "SOSTENIMIENTO").toUpperCase(),
                
                // 3. Nuevos campos de contacto
                unidadApoyada: (ev.unidadApoyada || "").toUpperCase(),
                pntoContactoNom: (ev.pntoContactoNom || "").toUpperCase(),
                pntoContactoTel: ev.pntoContactoTel || "",
                responsableNom: (ev.responsableNom || "").toUpperCase(),
                responsableTel: ev.responsableTel || "",

                // 4. Coordenadas
                origen: {
                    nombre: (ev.origen?.nombre || "ORIGEN").toUpperCase(),
                    lat: ev.origen?.lat || null,
                    lng: ev.origen?.lng || null
                },
                destino: {
                    nombre: (ev.destino?.nombre || "DESTINO").toUpperCase(),
                    lat: ev.destino?.lat || null,
                    lng: ev.destino?.lng || null
                }
            };

            // Ejecutamos la actualización
            await collection.updateOne(
                { _id: ev._id },
                { 
                    $set: repair,
                    $unset: { ubicacion: "" } // Limpieza de estructura vieja
                }
            );
            modificados++;
        }

        console.log(`\n✅ PROCESO COMPLETADO`);
        console.log(`✨ Eventos normalizados y alineados con la lógica de etapas: ${modificados}`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO DURANTE LA MIGRACIÓN:", error);
        process.exit(1);
    }
};

runMigration();