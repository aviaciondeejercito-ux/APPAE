import React, { useState, useEffect } from 'react';

const DashboardNovedades = () => {
  // --- ESTADOS ---
  const [novedades, setNovedades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [sda, setSda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // --- CONFIGURACIÓN DE URL DINÁMICA ---
  // Detecta automáticamente si estás trabajando local o apuntando al servidor de producción
  const OBTENER_BASE_URL = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000'; // Tu backend local
    }
    return 'https://appae.onrender.com'; // Tu backend real en producción 🚀
  };

  // --- FUNCIÓN PARA CONSULTAR LA API ---
  const obtenerNovedades = async () => {
    setLoading(true);
    setError(null);
    try {
      // Armamos los query params dinámicamente
      const params = new URLSearchParams();
      if (sda) params.append('sda', sda);
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);

      // Obtenemos el token de sesión
      const token = localStorage.getItem('token'); 

      const BASE_URL = OBTENER_BASE_URL();
      const url = `${BASE_URL}/api/dashboard/novedades?${params.toString()}`;
      
      const respuesta = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Middleware de seguridad activo 🛡️
        }
      });

      if (!respuesta.ok) {
        throw new Error('No se pudieron recuperar las novedades de la unidad.');
      }

      const resultado = await respuesta.json();
      setNovedades(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Consultar datos al montar el componente o al cambiar filtros
  useEffect(() => {
    obtenerNovedades();
  }, [sda, fechaInicio, fechaFin]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600 font-medium">Sincronizando panel de novedades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded my-4">
        <p className="text-red-700 font-bold">⚠️ Error en el Panel</p>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={obtenerNovedades} 
          className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  const { resumenMantenimiento, resumenVuelos } = novedades;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* CABECERA */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Panel de Novedades del Elemento</h1>
        <p className="text-gray-500 text-sm">Consolidado operativo: Estado de flota e historial de horas voladas (F-13).</p>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sistema de Armas (SDA)</label>
          <select 
            value={sda} 
            onChange={(e) => setSda(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los Sistemas</option>
            <option value="HUEY">UH-1H Huey</option>
            <option value="SUPER_PUMA">Super Puma</option>
            <option value="BELL206">Bell 206</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Desde</label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hasta</label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button 
          onClick={() => { setSda(''); setFechaInicio(''); setFechaFin(''); }}
          className="text-sm text-blue-600 hover:text-blue-800 font-semibold h-9 px-4"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase">Flota Total</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{resumenMantenimiento.totalAeronaves}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg font-bold">✈️</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase">En Servicio</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{resumenMantenimiento.operativas}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg font-bold">✓</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase">En Mantenimiento</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{resumenMantenimiento.enMantenimiento}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg font-bold">🔧</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase">Horas del Período</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{resumenVuelos.totalHorasVoladas} hs</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg font-bold">⏱️</div>
        </div>

      </div>

      {/* TABLAS DE NOVEDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA 1: NOVEDADES DE MANTENIMIENTO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🛠️</span> Estado Actual de la Flota
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 font-semibold">
                <tr>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Modelo / SDA</th>
                  <th className="px-4 py-3 text-right">Horas Totales</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumenMantenimiento.detalleFlota.map((nave) => (
                  <tr key={nave._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-800">{nave.matricula}</td>
                    <td className="px-4 py-3 text-xs">{nave.modelo} <span className="text-gray-400">({nave.sda})</span></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{nave.horasTotales} hs</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        nave.estado === 'En Servicio' || nave.enServicio
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {nave.estado === 'En Servicio' || nave.enServicio ? 'Operativo' : 'Inoperativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA 2: NOVEDADES DE HORAS VOLADAS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📝</span> Últimos Vuelos Registrados (F-13)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 font-semibold">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Aeronave</th>
                  <th className="px-4 py-3">Misión / Tripulación</th>
                  <th className="px-4 py-3 text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumenVuelos.ultimosVuelos.slice(0, 10).map((vuelo) => (
                  <tr key={vuelo._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(vuelo.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">
                      {vuelo.aeronave?.matricula || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-700 text-xs">{vuelo.misionVuelo}</p>
                      <p className="text-[10px] text-gray-400">Cmdte: {vuelo.comandante} | Mec: {vuelo.mecanico}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">
                      +{vuelo.horasDelDia} hs
                    </td>
                  </tr>
                ))}
                {resumenVuelos.ultimosVuelos.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-400">
                      No se encontraron registros de vuelo para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DashboardNovedades;