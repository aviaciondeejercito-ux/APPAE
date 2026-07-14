require('dotenv').config(); // Cargá tus variables de entorno para la conexión
const mongoose = require('mongoose');
const Tripulante = require('./backend/models/Tripulante');

// Cambiá esto por tu URI real si no usás .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:2027/tu_base_de_datos'; 

async function limpiarYMigrarTripulantes() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conexión establecida.');

        // ==========================================
        // 🚀 PASO 1: DETECTAR Y ELIMINAR DUPLICADOS
        // ==========================================
        console.log('\n🔍 Buscando tripulantes duplicados...');
        const todosLosTripulantes = await Tripulante.find({}).sort({ _id: -1 }); // Los más nuevos primero

        const mapeoUnicos = new Map();
        const idsParaEliminar = [];

        for (const t of todosLosTripulantes) {
            // Generamos una clave única limpia basada en Grado, Apellido y Nombre
            const claveUnica = `${t.grado || ''}_${t.apellido || ''}_${t.nombre || ''}`
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '');

            if (!mapeoUnicos.has(claveUnica)) {
                // Es la primera vez que vemos a este tripulante (y es el más nuevo por el orden del sort)
                mapeoUnicos.set(claveUnica, t);
            } else {
                // Ya existe una versión de este tripulante.
                const registroExistente = mapeoUnicos.get(claveUnica);
                
                // Estrategia de supervivencia: Si el viejo tiene certificaciones y el nuevo no, nos quedamos con el viejo
                const existenteTieneDatos = registroExistente.certificaciones?.psicofisico || registroExistente.certificaciones?.crm;
                const esteTieneDatos = t.certificaciones?.psicofisico || t.certificaciones?.crm;

                if (!existenteTieneDatos && esteTieneDatos) {
                    // El que guardamos antes estaba vacío, pero este viejo sí tiene datos. Intercambiamos.
                    idsParaEliminar.push(registroExistente._id);
                    mapeoUnicos.set(claveUnica, t);
                    console.log(`♻️  Conservando versión con datos de: ${t.apellido}, ${t.nombre}`);
                } else {
                    // El que ya teníamos es el mejor o el más nuevo, este se va.
                    idsParaEliminar.push(t._id);
                }
            }
        }

        if (idsParaEliminar.length > 0) {
            console.log(`🚨 Se encontraron ${idsParaEliminar.length} registros duplicados de tripulantes.`);
            const deleteResult = await Tripulante.deleteMany({ _id: { $in: idsParaEliminar } });
            console.log(`🗑️  Eliminados exitosamente ${deleteResult.deletedCount} duplicados obsoletos.`);
        } else {
            console.log('✅ No se detectaron tripulantes duplicados.');
        }

        // ==========================================
        // 🚀 PASO 2: NORMALIZAR ESQUEMAS VIEJOS
        // ==========================================
        console.log('\n⚙️  Normalizando estructuras de esquemas viejos...');
        const tripulantesRestantes = await Tripulante.find({});
        let actualizados = 0;

        for (const t of tripulantesRestantes) {
            let huboCambio = false;

            // Inicializar el objeto contenedor si no existe en absoluto
            if (!t.certificaciones) {
                t.certificaciones = {};
                huboCambio = true;
            }

            // Adaptar Psicofísico si venía suelto en la raíz (ej: t.psicofisico Vencimiento directo)
            if (t.psicofisico && !t.certificaciones.psicofisico) {
                t.certificaciones.psicofisico = {
                    vencimiento: t.psicofisico.vencimiento || t.psicofisico || null
                };
                huboCambio = true;
            } else if (!t.certificaciones.psicofisico) {
                // Garantizar que la propiedad exista aunque sea en null
                t.certificaciones.psicofisico = { vencimiento: null };
                huboCambio = true;
            }

            // Adaptar CRM si venía suelto en la raíz o faltaba
            if (t.crm && !t.certificaciones.crm) {
                t.certificaciones.crm = {
                    vencimiento: t.crm.vencimiento || t.crm || null
                };
                huboCambio = true;
            } else if (!t.certificaciones.crm) {
                t.certificaciones.crm = { vencimiento: null };
                huboCambio = true;
            }

            if (huboCambio) {
                // Usamos updateOne para forzar que guarde la estructura exacta salteándose validaciones rígidas del modelo si hiciera falta
                await Tripulante.updateOne(
                    { _id: t._id },
                    { $set: { certificaciones: t.certificaciones } }
                );
                actualizados++;
            }
        }

        console.log(`✅ Estructuras normalizadas. Se actualizaron ${actualizados} tripulantes al modelo nuevo.`);

    } catch (error) {
        console.error('❌ Error crítico durante la ejecución del script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB. Proceso finalizado.');
    }
}

limpiarYMigrarTripulantes();