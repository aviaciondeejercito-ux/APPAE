const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

// ⚠️ MODO DE PRUEBA: 
// true = Solo simula el borrado y te muestra en consola qué se eliminaría.
// false = Elimina de verdad los registros en la base de datos.
const DRY_RUN = false; 

async function depurarDuplicados() {
  try {
    console.log(`Conectando a MongoDB Atlas... (Modo DRY_RUN: ${DRY_RUN})\n`);
    await mongoose.connect(MONGO_URI);

    const db = mongoose.connection.db;
    const collection = db.collection('tripulantes');

    // 1. Obtener grupos duplicados
    const duplicados = await collection.aggregate([
      {
        $group: {
          _id: {
            apellido: { $toLower: "$apellido" },
            nombre: { $toLower: "$nombre" }
          },
          total: { $sum: 1 },
          documentos: {
            $push: {
              id: "$_id",
              grado: "$grado",
              unidad: { $ifNull: ["$unidad", "$elemento"] },
              activo: "$activo",
              updatedAt: "$updatedAt"
            }
          }
        }
      },
      { $match: { total: {$gt: 1 } } }
    ]).toArray();

    if (duplicados.length === 0) {
      console.log('✅ No hay duplicados para depurar.');
      return;
    }

    const idsAEliminar = [];

    duplicados.forEach(grupo => {
      const docs = grupo.documentos;
      const nombre = `${grupo._id.apellido.toUpperCase()}, ${grupo._id.nombre.toUpperCase()}`;

      // Ordenar: Primero los Activos (true), luego por fecha de modificación más reciente
      docs.sort((a, b) => {
        if (a.activo !== b.activo) return a.activo ? -1 : 1; // true primero
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); // más reciente primero
      });

      // El primero es el que CONSERVAMOS
      const conservado = docs[0];
      const paraEliminar = docs.slice(1);

      console.log(`👤 ${nombre}`);
      console.log(`   🟢 CONSERVAR  -> ID: ${conservado.id} | Grado: ${conservado.grado} | Activo: ${conservado.activo}`);
      
      paraEliminar.forEach(doc => {
        console.log(`   🔴 ELIMINAR   -> ID: ${doc.id} | Grado: ${doc.grado} | Activo: ${doc.activo}`);
        idsAEliminar.push(doc.id);
      });
      console.log('--------------------------------------------------');
    });

    if (idsAEliminar.length > 0) {
      if (DRY_RUN) {
        console.log(`\n🔍 SIMULACIÓN FINALIZADA: Se eliminarían ${idsAEliminar.length} registros duplicados.`);
        console.log('👉 Para aplicar los cambios reales, abre limpiarDuplicados.js y cambia "const DRY_RUN = true;" a "false".');
      } else {
        const res = await collection.deleteMany({ _id: { $in: idsAEliminar } });
        console.log(`\n✅ DEPURACIÓN COMPLETADA: Se eliminaron ${res.deletedCount} registros duplicados de la base de datos.`);
      }
    }

  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Conexión cerrada.');
  }
}

depurarDuplicados();