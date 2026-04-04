const mongoose = require('mongoose');

// URI de Atlas
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

const runMigration = async () => {
    try {
        console.log("🛠️  Iniciando normalización de base de datos (Versión SINCRO JOKER)...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conexión establecida.");

        const db = mongoose.connection.db;
        const collection = db.collection('events');

        const events = await collection.find({}).toArray();
        console.log(`📦 Procesando ${events.length} eventos.`);

        let modificados = 0;

        for (let ev of events) {
            // 1. Normalización de Elemento y Creador
            const elementoFinal = (ev.elemento || ev.ubicacion?.elemento || "POR CLASIFICAR").toUpperCase().trim();
            const creadorFinal = (ev.creadorUnidad || elementoFinal).toUpperCase().trim();
            
            // 2. Lógica de Globalidad: DIR AE/SEC AE o marcado manual previo
            let esGlobalFinal = false;
            if (creadorFinal.includes('DIR AE') || creadorFinal.includes('SEC AE') || ev.esGlobal === true) {
                esGlobalFinal = true;
            }

            // 3. Normalización de Etapa
            let etapaFinal = (ev.etapa || ev.ubicacion?.etapa || "ordenada").toLowerCase().trim();
            const etapasValidas = ['recepcion', 'revision', 'ordenada'];
            if (!etapasValidas.includes(etapaFinal)) etapaFinal = 'ordenada';

            // 4. Misión (Nuevo campo para colores del calendario)
            // Si no existe, lo deducimos de tipoApoyo o por defecto SOSTENIMIENTO
            let misionFinal = (ev.mision || ev.tipoApoyo || "SOSTENIMIENTO").toUpperCase().trim();

            // 5. Reparación de sdaListado (Formato objeto: { sda, cantidad })
            let sdaReparado = [];
            if (Array.isArray(ev.sdaListado)) {
                sdaReparado = ev.sdaListado.map(item => {
                    if (typeof item === 'string') {
                        return { sda: item.toUpperCase().trim(), cantidad: 1 };
                    }
                    return { 
                        sda: (item.sda || "S/D").toUpperCase().trim(), 
                        cantidad: parseInt(item.cantidad) || 1 
                    };
                });
            }

            const repair = {
                elemento: elementoFinal,
                creadorUnidad: creadorFinal,
                etapa: etapaFinal,
                mision: misionFinal, // Agregado para lectura de colores
                tipoOrigen: ev.tipoOrigen || ev.ubicacion?.tipoOrigen || "MIGRACION",
                esGlobal: esGlobalFinal,
                sdaListado: sdaReparado,
                tipoApoyo: (ev.tipoApoyo || ev.mision || "SOSTENIMIENTO").toUpperCase().trim(),
                unidadApoyada: (ev.unidadApoyada || "").toUpperCase().trim(),
                pntoContactoNom: (ev.pntoContactoNom || "").toUpperCase().trim(),
                pntoContactoTel: ev.pntoContactoTel || "",
                responsableNom: (ev.responsableNom || "").toUpperCase().trim(),
                responsableTel: ev.responsableTel || "",
                origen: {
                    nombre: (ev.origen?.nombre || ev.ubicacion?.origen || "ORIGEN").toUpperCase().trim(),
                    lat: ev.origen?.lat || ev.ubicacion?.lat || null,
                    lng: ev.origen?.lng || ev.ubicacion?.lng || null
                },
                destino: {
                    nombre: (ev.destino?.nombre || "DESTINO").toUpperCase().trim(),
                    lat: ev.destino?.lat || null,
                    lng: ev.destino?.lng || null
                }
            };

            await collection.updateOne(
                { _id: ev._id },
                { 
                    $set: repair,
                    $unset: { 
                        ubicacion: "", 
                        esRealTime: "",
                        // Limpiamos campos residuales si existen para mantener la DB limpia
                        "origen.elemento": "", 
                        "origen.etapa": "" 
                    } 
                }
            );
            modificados++;
        }

        console.log(`\n✅ MIGRACIÓN EXITOSA`);
        console.log(`✨ ${modificados} eventos alineados con el nuevo modelo de datos.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN MIGRACIÓN:", error);
        process.exit(1);
    }
};

runMigration();