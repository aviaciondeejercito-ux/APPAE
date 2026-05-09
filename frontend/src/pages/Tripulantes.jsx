import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Eye, UserPlus, RefreshCw, Award, Clock, Shield } from 'lucide-react';

const Tripulantes = () => {
  const [tripulantes, setTripulantes] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);

  // Definimos el orden jerárquico de los grados
  const ordenGrados = {
    "CR": 1, "TC": 2, "MY": 3, "CT": 4, "TP": 5, "TT": 6, "ST": 7,
    "SM": 8, "SP": 9, "SA": 10, "SI": 11, "SG": 12, "CI": 13, "CB": 14
  };

  useEffect(() => {
    cargarTripulantes();
  }, []);

  const cargarTripulantes = async () => {
    try {
      const res = await axios.get('/api/tripulantes');
      // Ordenar por grado y luego por apellido
      const ordenados = res.data.sort((a, b) => {
        if (ordenGrados[a.grado] !== ordenGrados[b.grado]) {
          return ordenGrados[a.grado] - ordenGrados[b.grado];
        }
        return a.apellido.localeCompare(b.apellido);
      });
      setTripulantes(ordenados);
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar personal", error);
    }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Está seguro de eliminar este tripulante? Esta acción quedará registrada en auditoría.")) {
      await axios.delete(`/api/tripulantes/${id}`);
      cargarTripulantes();
      if (seleccionado?._id === id) setSeleccionado(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* SECCIÓN IZQUIERDA: LISTA DE PERSONAL */}
      <div className="w-1/2 flex flex-col border-r bg-white shadow-lg">
        <div className="p-4 border-b flex justify-between items-center bg-slate-800 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield size={24} /> Personal de la Unidad
          </h2>
          <button className="bg-green-600 hover:bg-green-700 p-2 rounded-full transition-colors">
            <UserPlus size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50 sticky top-0 shadow-sm">
              <tr>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Grado y Apellido</th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tripulantes.map((t) => (
                <tr 
                  key={t._id} 
                  onClick={() => setSeleccionado(t)}
                  className={`border-b cursor-pointer transition-colors ${seleccionado?._id === t._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}
                >
                  <td className="p-3">
                    <span className="font-bold text-blue-900 mr-2">{t.grado}</span>
                    <span className="uppercase">{t.apellido}</span>, {t.nombre}
                  </td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => setSeleccionado(t)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Eye size={18}/></button>
                    <button onClick={(e) => { e.stopPropagation(); eliminar(t._id); }} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN DERECHA: IDENTIKIT / LEGADO DE VUELO */}
      <div className="w-1/2 bg-gray-50 overflow-y-auto p-6">
        {seleccionado ? (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Cabecera del Legajo */}
            <div className="bg-slate-700 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black uppercase">{seleccionado.apellido}, {seleccionado.nombre}</h3>
                  <p className="text-slate-300 font-bold">{seleccionado.grado} - {seleccionado.unidad}</p>
                </div>
                <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm flex items-center gap-2">
                  <RefreshCw size={16} /> Actualizar
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Bloque 1: Identikit de Horas Totales */}
              <section>
                <h4 className="flex items-center gap-2 text-slate-800 font-bold border-b pb-2 mb-4">
                  <Clock size={18} /> TOTALES HISTÓRICOS (HORAS DE VUELO)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold uppercase">Diurno</p>
                    <p className="text-xl font-black text-blue-900">{seleccionado.totalesHistoricos?.vueloDiurno || 0}hs</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-600 font-bold uppercase">Nocturno</p>
                    <p className="text-xl font-black text-indigo-900">{seleccionado.totalesHistoricos?.vueloNocturno || 0}hs</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-bold uppercase">Aterrizajes</p>
                    <p className="text-xl font-black text-emerald-900">{seleccionado.totalesHistoricos?.aterrizajes || 0}</p>
                  </div>
                </div>
              </section>

              {/* Bloque 2: Habilitaciones y Sistemas */}
              <section>
                <h4 className="flex items-center gap-2 text-slate-800 font-bold border-b pb-2 mb-4">
                  <Award size={18} /> HABILITACIONES POR SISTEMA
                </h4>
                <div className="space-y-2">
                  {seleccionado.habilitaciones?.map((h, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                      <div>
                        <span className="font-black text-slate-700">{h.aeronave}</span>
                        <span className="ml-3 text-sm bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold">{h.rolActual}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-500">{h.ultimaActividad?.totalHorasSistema || 0} hs totales</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bloque 3: Capacitaciones Especiales */}
              <section>
                <h4 className="flex items-center gap-2 text-slate-800 font-bold border-b pb-2 mb-4">
                  <Shield size={18} /> CAPACITACIONES TÁCTICAS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {seleccionado.capacitacionesEspeciales?.map((cap, i) => (
                    <span key={i} className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
                      {cap.tipo}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Eye size={48} className="mb-4 opacity-20" />
            <p>Seleccione un tripulante para ver su legajo completo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tripulantes;