import React, { useState, useEffect } from 'react';
import { EventService } from '../services/api'; 
import { Trash2, Eye, UserPlus, Shield, User, Clock, Award, X, Save, AlertTriangle } from 'lucide-react';

const Tripulantes = () => {
  const [tripulantes, setTripulantes] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Estado para el formulario de nuevo tripulante
  const [nuevo, setNuevo] = useState({
    apellido: '', nombre: '', grado: 'ST', unidad: localStorage.getItem('elemento') || '',
    totalesHistoricos: { vueloDiurno: 0, vueloNocturno: 0, vueloInstrumental: 0, vueloVisual: 0, aterrizajes: 0 }
  });

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
      const res = await EventService.getTripulantes();
      const ordenados = res.data.sort((a, b) => {
        const pesoA = ordenGrados[a.grado] || 99;
        const pesoB = ordenGrados[b.grado] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.apellido.localeCompare(b.apellido);
      });
      setTripulantes(ordenados);
    } catch (error) {
      console.error("❌ Error al cargar:", error);
    } finally {
      setLoading(false);
    }
  };

  const manejarCrear = async (e) => {
    e.preventDefault();
    try {
      await EventService.createTripulante(nuevo);
      setShowModal(false);
      setNuevo({ apellido: '', nombre: '', grado: 'ST', unidad: localStorage.getItem('elemento') || '', totalesHistoricos: { vueloDiurno: 0, vueloNocturno: 0, vueloInstrumental: 0, vueloVisual: 0, aterrizajes: 0 } });
      cargarTripulantes();
    } catch (error) {
      alert("Error al crear: " + error.response?.data?.mensaje);
    }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Confirmar eliminación? Se registrará en auditoría.")) {
      try {
        await EventService.deleteTripulante(id);
        cargarTripulantes();
        if (seleccionado?._id === id) setSeleccionado(null);
      } catch (error) {
        alert("Error al eliminar");
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-slate-100 overflow-hidden text-slate-800">
      
      {/* LISTADO IZQUIERDO */}
      <div className="w-80 flex flex-col bg-white border-r border-slate-300 shadow-xl z-10">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="text-yellow-500" size={18} />
            <h2 className="font-black text-xs uppercase tracking-widest">Personal</h2>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-all active:scale-90"
          >
            <UserPlus size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse text-xs font-bold">CONECTANDO...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tripulantes.map((t) => (
                <div 
                  key={t._id} 
                  onClick={() => setSeleccionado(t)}
                  className={`p-4 cursor-pointer transition-all border-l-4 ${seleccionado?._id === t._id ? 'bg-blue-50 border-blue-600' : 'hover:bg-slate-50 border-transparent'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 leading-none">{t.grado}</p>
                      <p className="font-bold uppercase text-sm tracking-tight">{t.apellido}, {t.nombre}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{t.unidad}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); eliminar(t._id); }} className="text-slate-300 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DETALLE DERECHO */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-6 custom-scrollbar">
        {seleccionado ? (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header Legajo */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 p-6 text-white flex items-center gap-6">
                <div className="h-20 w-20 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-slate-600">
                  <User size={40} className="text-slate-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic">{seleccionado.grado} {seleccionado.apellido}</h3>
                  <p className="text-slate-400 text-xs font-bold tracking-widest">{seleccionado.nombre} | {seleccionado.unidad}</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Alertas de Vencimiento */}
                <div className="col-span-full grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg border flex items-center gap-3 ${seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <AlertTriangle size={18} />
                    <div>
                      <p className="text-[10px] font-black uppercase">Psicofísico</p>
                      <p className="text-xs font-bold">{seleccionado.estadoCertificaciones?.psicofisicoVencido ? 'VENCIDO / NO APTO' : 'VIGENTE / APTO'}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg border flex items-center gap-3 ${seleccionado.estadoCertificaciones?.crmVencido ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <AlertTriangle size={18} />
                    <div>
                      <p className="text-[10px] font-black uppercase">Curso CRM</p>
                      <p className="text-xs font-bold">{seleccionado.estadoCertificaciones?.crmVencido ? 'VENCIDO' : 'AL DÍA'}</p>
                    </div>
                  </div>
                </div>

                {/* Horas */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-3 text-blue-600">
                    <Clock size={16} /> <span className="text-[10px] font-black uppercase">Totales Vuelo</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{seleccionado.totalVueloGeneral || 0}<span className="text-xs ml-1">HS</span></p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-3 text-orange-600">
                    <Award size={16} /> <span className="text-[10px] font-black uppercase">Sistemas</span>
                  </div>
                  <div className="space-y-1">
                    {seleccionado.habilitaciones?.map((h, i) => (
                      <p key={i} className="text-[10px] font-bold uppercase flex justify-between">
                        <span>{h.aeronave}</span> <span className="text-slate-400">{h.rolActual}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 flex-col gap-4">
            <Shield size={80} strokeWidth={1} />
            <p className="font-black uppercase text-sm tracking-widest">Seleccione un legajo para inspección</p>
          </div>
        )}
      </div>

      {/* MODAL DE ALTA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={manejarCrear} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase">Nuevo Legajo de Vuelo</h3>
              <button type="button" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Grado</label>
                  <select 
                    className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-500 outline-none font-bold"
                    value={nuevo.grado}
                    onChange={e => setNuevo({...nuevo, grado: e.target.value})}
                  >
                    {Object.keys(ordenGrados).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Unidad</label>
                  <input type="text" readOnly className="w-full bg-slate-50 py-2 font-bold text-slate-500 italic" value={nuevo.unidad} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Apellido</label>
                <input 
                  type="text" required className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-500 outline-none font-bold uppercase"
                  value={nuevo.apellido} onChange={e => setNuevo({...nuevo, apellido: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Nombre</label>
                <input 
                  type="text" required className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-500 outline-none font-bold uppercase"
                  value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})}
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 text-right">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 ml-auto hover:bg-blue-700">
                <Save size={16}/> Guardar Legajo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Tripulantes;