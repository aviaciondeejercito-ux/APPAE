import React, { useState, useEffect } from 'react';
// IMPORTANTE: Usamos EventService y API en lugar de axios pelado
import { EventService } from '../services/api'; 
import { Trash2, Eye, UserPlus, Shield, User, Clock, Award } from 'lucide-react';

const Tripulantes = () => {
  const [tripulantes, setTripulantes] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);

  const ordenGrados = {
    "CR": 1, "TC": 2, "MY": 3, "CT": 4, "TP": 5, "TT": 6, "ST": 7,
    "SM": 8, "SP": 9, "SA": 10, "SI": 11, "SG": 12, "CI": 13, "CB": 14
  };

  useEffect(() => {
    cargarTripulantes();
  }, []);

  const cargarTripulantes = async () => {
    try {
      setLoading(true);
      // Usamos el servicio centralizado que ya conoce la URL del backend
      const res = await EventService.getTripulantes();
      
      const ordenados = res.data.sort((a, b) => {
        const pesoA = ordenGrados[a.grado] || 99;
        const pesoB = ordenGrados[b.grado] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.apellido.localeCompare(b.apellido);
      });
      setTripulantes(ordenados);
    } catch (error) {
      console.error("❌ Error al cargar personal:", error);
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Confirmar eliminación de legajo? Esta acción es irreversible.")) {
      try {
        await EventService.deleteTripulante(id);
        cargarTripulantes();
        if (seleccionado?._id === id) setSeleccionado(null);
      } catch (error) {
        alert("Error al eliminar el registro");
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-slate-100 overflow-hidden">
      
      {/* PANEL IZQUIERDO: LISTADO */}
      <div className="w-1/3 flex flex-col bg-white border-r border-slate-300 shadow-inner">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Shield className="text-yellow-500" size={20} />
            <h2 className="font-bold tracking-tighter uppercase">Personal de la Unidad</h2>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 p-1.5 rounded-lg transition-all active:scale-95 shadow-lg">
            <UserPlus size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse font-bold">
              ESTABLECIENDO CONEXIÓN CON BASE DE DATOS AE...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 border-b z-10">
                <tr>
                  <th className="p-3 text-left text-slate-500 font-black uppercase text-[10px]">Jerarquía y Apellido</th>
                  <th className="p-3 text-right text-slate-500 font-black uppercase text-[10px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tripulantes.map((t) => (
                  <tr 
                    key={t._id} 
                    onClick={() => setSeleccionado(t)}
                    className={`group cursor-pointer transition-all ${seleccionado?._id === t._id ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className={`font-black text-xs ${seleccionado?._id === t._id ? 'text-blue-100' : 'text-blue-800'}`}>{t.grado}</span>
                        <span className="font-bold uppercase tracking-tight">{t.apellido}, {t.nombre}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); eliminar(t._id); }} 
                          className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: DETALLE (LEGAJO) */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-200 shadow-inner border-t border-white">
        {seleccionado ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-300">
              {/* Header Legajo */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={120} />
                </div>
                <div className="relative z-10 flex items-center gap-6">
                  <div className="h-24 w-24 bg-slate-700 rounded-full border-4 border-slate-600 flex items-center justify-center shadow-2xl">
                    <User size={50} className="text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">
                      {seleccionado.apellido}, {seleccionado.nombre}
                    </h3>
                    <div className="flex gap-4 mt-2">
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/30">
                        {seleccionado.grado}
                      </span>
                      <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-slate-600">
                        UNIDAD: {seleccionado.unidad || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cuerpo del Legajo */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                
                {/* Stats de Vuelo */}
                <div className="space-y-6">
                  <h4 className="flex items-center gap-2 font-black text-slate-800 border-b-2 border-slate-100 pb-2">
                    <Clock className="text-blue-600" size={20} /> HISTORIAL DE VUELO
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">Vuelo Diurno</p>
                      <p className="text-2xl font-black text-slate-800">
                        {seleccionado.totalesHistoricos?.vueloDiurno || 0}<span className="text-xs ml-1">HS</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">Vuelo Nocturno</p>
                      <p className="text-2xl font-black text-slate-800">
                        {seleccionado.totalesHistoricos?.vueloNocturno || 0}<span className="text-xs ml-1">HS</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Habilitaciones */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-black text-slate-800 border-b-2 border-slate-100 pb-2">
                    <Award className="text-yellow-600" size={20} /> SISTEMAS DE ARMAS
                  </h4>
                  <div className="space-y-2">
                    {seleccionado.habilitaciones?.length > 0 ? (
                      seleccionado.habilitaciones.map((h, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-all">
                          <span className="font-black text-xs text-slate-700">{h.aeronave}</span>
                          <span className="text-[10px] bg-white px-2 py-1 rounded border font-bold text-slate-500 uppercase">{h.rolActual}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Sin sistemas registrados</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="p-12 bg-white/50 rounded-full border-4 border-dashed border-slate-300 flex flex-col items-center">
              <Eye size={60} className="text-slate-300 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Seleccione un legajo para inspección</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tripulantes;