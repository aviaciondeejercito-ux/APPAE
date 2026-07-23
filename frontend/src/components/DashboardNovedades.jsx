import React, { useState, useEffect } from 'react';

const DashboardNovedades = () => {
  // 🛡️ REBOTAR AL LOGIN SI NO HAY TOKEN
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return null;
  }

  // --- DETECTAR UNIDAD Y ROL DEL USUARIO ---
  const unidadUsuario = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';
  const rolUsuario = (localStorage.getItem('role') || localStorage.getItem('rol') || 'USER').toUpperCase();
  
  // 👑 ROLES CON ACCESO TOTAL
  const tieneAccesoTotal = rolUsuario === 'ADMIN' || rolUsuario === 'BOSS' || rolUsuario === 'DIRECTOR';

  // --- ESTADOS ---
  const [novedades, setNovedades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros operativos
  const [sda, setSda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(tieneAccesoTotal ? 'TODAS' : unidadUsuario);
  const [tabActiva, setTabActiva] = useState('aeronave');
  const [horasManuales, setHorasManuales] = useState({});

  // --- CONFIGURACIÓN DE URL DINÁMICA ---
  const OBTENER_BASE_URL = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://appae.onrender.com';
  };

  // --- FUNCIÓN PARA CONSULTAR LA API ---
  const obtenerNovedades = async () => {
    if (!tieneAccesoTotal && !unidadUsuario) {
      setError("No se detectó la unidad asignada a tu usuario. Contactá al administrador.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sda) params.append('sda', sda);
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      params.append('unidad', unidadSeleccionada);

      const BASE_URL = OBTENER_BASE_URL();
      const url = `${BASE_URL}/api/dashboard/novedades?${params.toString()}`;
      
      const respuesta = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (respuesta.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('unidad');
        window.location.href = '/login';
        return;
      }

      if (!respuesta.ok) {
        throw new Error('No se pudieron recuperar las novedades de tu unidad.');
      }

      const resultado = await respuesta.json();
      setNovedades(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerNovedades();
  }, [sda, fechaInicio, fechaFin, unidadSeleccionada]);

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginLeft: '15px', color: '#1e293b', fontWeight: 'bold' }}>
          Sincronizando panel de novedades
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorAlert}>
        <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>⚠️ Error en el Canal de Datos</p>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>{error}</p>
        <button onClick={obtenerNovedades} style={styles.btnRetry}>
          Reintentar conexión
        </button>
      </div>
    );
  }

  const { resumenMantenimiento, resumenVuelos } = novedades;
  const flotaCompleta = resumenMantenimiento?.detalleFlota || [];
  const listaVuelos = resumenVuelos?.ultimosVuelos || [];

  // Filtrado de flota
  const flotaFiltrada = tieneAccesoTotal 
    ? flotaCompleta
    : flotaCompleta.filter(
        nave => !nave.unidad || nave.unidad.toUpperCase() === unidadUsuario.toUpperCase()
      );

  const chequearOperativo = (nave) => nave.estadoOperativo === 'E/S';
  const cantidadOperativas = flotaFiltrada.filter(n => chequearOperativo(n)).length;
  const cantidadEnMantenimiento = flotaFiltrada.length - cantidadOperativas;

  const sdaDisponibles = Array.from(new Set(flotaFiltrada.map(nave => nave.sda).filter(Boolean))).sort();
  const unidadesDisponibles = Array.from(new Set(flotaCompleta.map(nave => nave.unidad).filter(Boolean))).sort();

  // --- HORAS ESTRUCTURALES ---
  const mapaUltimoVueloAeronave = {};
  
  // Helper para parsear la fecha de forma segura
  const obtenerAnioVuelo = (fechaStr) => {
    if (!fechaStr) return null;
    const dateObj = new Date(fechaStr);
    return isNaN(dateObj.getTime()) ? null : dateObj.getUTCFullYear();
  };

  const vuelosOrdenadosCronologicamente = [...listaVuelos].sort(
    (a, b) => new Date(a.fecha || a.fechaVuelo) - new Date(b.fecha || b.fechaVuelo)
  );

  vuelosOrdenadosCronologicamente.forEach(v => {
    const matricula = v.aeronave?.matricula || v.aeronave;
    if (matricula) {
      const totalVuelo = v.horasTotales || v.horasAcumuladas || 0;
      mapaUltimoVueloAeronave[matricula] = Number(Number(totalVuelo).toFixed(2));
    }
  });

  const obtenerHorasEstructuralesSolidas = (nave) => {
    const ultimoAcumuladoF13 = mapaUltimoVueloAeronave[nave.matricula];
    if (ultimoAcumuladoF13 !== undefined && ultimoAcumuladoF13 > 0) {
      return ultimoAcumuladoF13;
    }
    return nave.horasTotales || nave.tgPlaneadorActual || nave.inicioAeHs || 0;
  };

  // --- 📅 CÁLCULO ESTRICTO DE TODAS LAS HORAS DEL AÑO (HISTÓRICAS Y NUEVAS) ---
  const anioActual = new Date().getFullYear();
  
  const totalHorasAnioActual = listaVuelos.reduce((sum, v) => {
    const rawFecha = v.fecha || v.fechaVuelo;
    if (!rawFecha) return sum;
    
    const anioVuelo = obtenerAnioVuelo(rawFecha);
    if (anioVuelo === anioActual) {
      const hs = Number(v.horasDelDia || v.horasVoladas || 0);
      return sum + (isNaN(hs) ? 0 : hs);
    }
    return sum;
  }, 0);

  // --- PROCESAMIENTO ANALÍTICO ---
  const horasPorAeronave = {};
  const horasPorMision = {};
  const horasPorMes = {};

  listaVuelos.forEach(v => {
    const rawFecha = v.fecha || v.fechaVuelo;
    const hs = Number(v.horasDelDia || v.horasVoladas || 0);
    if (isNaN(hs) || hs <= 0) return;

    // 1. Por Aeronave
    const mat = v.aeronave?.matricula || v.aeronave || 'S/M';
    horasPorAeronave[mat] = (horasPorAeronave[mat] || 0) + hs;

    // 2. Por Misión
    const mision = v.misionVuelo || v.mision || 'Otras Operaciones';
    horasPorMision[mision] = (horasPorMision[mision] || 0) + hs;

    // 3. Por Mes
    if (rawFecha) {
      const fechaObj = new Date(rawFecha);
      if (!isNaN(fechaObj.getTime())) {
        const nombreMes = fechaObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        horasPorMes[nombreMes] = (horasPorMes[nombreMes] || 0) + hs;
      }
    }
  });

  const rankingAeronaves = Object.entries(horasPorAeronave)
    .map(([matricula, horas]) => ({ matricula, horas: Number(horas.toFixed(2)) }))
    .sort((a, b) => b.horas - a.horas);

  const rankingMisiones = Object.entries(horasPorMision)
    .map(([mision, horas]) => ({ mision, horas: Number(horas.toFixed(2)) }))
    .sort((a, b) => b.horas - a.horas);

  const rankingFechas = Object.entries(horasPorMes)
    .map(([mes, horas]) => ({ mes, horas: Number(horas.toFixed(2)) }));

  const handleCambioHorasManuales = (naveId, valor) => {
    setHorasManuales(prev => ({ ...prev, [naveId]: valor }));
  };

  return (
    <div style={styles.dashboardContainer}>
      
      {/* CABECERA */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={styles.title}>Panel de Novedades de Mantenimiento</h1>
          <span style={styles.badgeUnidad}>
            {tieneAccesoTotal ? `VISTA SUPERVISOR (${rolUsuario})` : unidadUsuario}
          </span>
        </div>
        <p style={styles.subtitle}>Consolidado operativo y analítico de flota e historial F-13.</p>
      </div>

      {/* MINI KPIs */}
      <div style={styles.miniKpiRow}>
        <div style={styles.miniKpiCard}>
          <span style={styles.miniKpiIcon}>✈️</span>
          <div>
            <span style={styles.miniKpiLabel}>Asignadas</span>
            <span style={styles.miniKpiValue}>{flotaFiltrada.length}</span>
          </div>
        </div>
        <div style={styles.miniKpiCard}>
          <span style={{...styles.miniKpiIcon, color: '#059669'}}>✓</span>
          <div>
            <span style={styles.miniKpiLabel}>E/S (En Serv.)</span>
            <span style={{...styles.miniKpiValue, color: '#059669'}}>{cantidadOperativas}</span>
          </div>
        </div>
        <div style={styles.miniKpiCard}>
          <span style={{...styles.miniKpiIcon, color: '#d97706'}}>🔧</span>
          <div>
            <span style={styles.miniKpiLabel}>F/S (En Mant.)</span>
            <span style={{...styles.miniKpiValue, color: '#d97706'}}>{cantidadEnMantenimiento}</span>
          </div>
        </div>
        <div style={styles.miniKpiCard}>
          <span style={{...styles.miniKpiIcon, color: '#4f46e5'}}>⏱️</span>
          <div>
            <span style={styles.miniKpiLabel}>Horas Período / Filtro</span>
            <span style={{...styles.miniKpiValue, color: '#4f46e5'}}>{resumenVuelos?.totalHorasVoladas || 0} hs</span>
          </div>
        </div>
        <div style={{...styles.miniKpiCard, borderLeft: '4px solid #06b6d4'}}>
          <span style={{...styles.miniKpiIcon, color: '#06b6d4'}}>📅</span>
          <div>
            <span style={styles.miniKpiLabel}>Total Volado Año ({anioActual})</span>
            <span style={{...styles.miniKpiValue, color: '#06b6d4'}}>{Number(totalHorasAnioActual.toFixed(2))} hs</span>
          </div>
        </div>
      </div>

      {/* FILTROS OPERATIVOS */}
      <div style={styles.filterBar}>
        {tieneAccesoTotal && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>🏢 Unidad / Elemento</label>
            <select 
              value={unidadSeleccionada} 
              onChange={(e) => setUnidadSeleccionada(e.target.value)} 
              style={{...styles.select, border: '1px solid #3b82f6', backgroundColor: '#f0fdf4'}}
            >
              <option value="TODAS">TODAS LAS UNIDADES</option>
              {unidadesDisponibles.map(uni => (
                <option key={uni} value={uni}>{uni}</option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>SDA (Sistema de Armas)</label>
          <select value={sda} onChange={(e) => setSda(e.target.value)} style={styles.select}>
            <option value="">Todos los asignados</option>
            {sdaDisponibles.map(sistema => (
              <option key={sistema} value={sistema}>{sistema}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Desde</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={styles.inputDate} />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Hasta</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={styles.inputDate} />
        </div>
        <button 
          onClick={() => { 
            setSda(''); 
            setFechaInicio(''); 
            setFechaFin(''); 
            if (tieneAccesoTotal) setUnidadSeleccionada('TODAS');
          }} 
          style={styles.btnClean}
        >
          Limpiar
        </button>
      </div>

      {/* TABLERO */}
      <div style={styles.tablesGrid}>
        
        {/* COLUMNA 1: ESTADO DE LA FLOTA */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>🛠️ Estado de la Flota</h2>
          <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Matrícula</th>
                  <th style={styles.th}>SDA</th>
                  {tieneAccesoTotal && <th style={styles.th}>Unidad</th>}
                  <th style={{...styles.th, textAlign: 'right'}}>Hrs. Totales (Estructura)</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {flotaFiltrada.map((nave) => {
                  const operativo = chequearOperativo(nave);
                  const horasEstructurales = obtenerHorasEstructuralesSolidas(nave);
                  const tieneDatoDb = horasEstructurales > 0;
                  const iconoTipo = nave.tipoIcono === 'ala_fija' ? '✈️' : '🚁';

                  return (
                    <tr key={nave._id} style={styles.tableRow}>
                      <td style={{...styles.td, fontWeight: 'bold'}}>
                        <span style={{ marginRight: '6px' }}>{iconoTipo}</span>
                        {nave.matricula}
                      </td>
                      <td style={styles.td}>{nave.sda}</td>
                      {tieneAccesoTotal && (
                        <td style={{...styles.td, fontSize: '0.7rem', color: '#64748b', fontWeight: '600'}}>
                          {nave.unidad || 'S/U'}
                        </td>
                      )}
                      <td style={{...styles.td, textAlign: 'right'}}>
                        {tieneDatoDb ? (
                          <span style={{ fontWeight: '700', color: '#1e293b' }}>
                            {horasEstructurales} hs
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Cargar hs"
                            value={horasManuales[nave._id] !== undefined ? horasManuales[nave._id] : ''}
                            onChange={(e) => handleCambioHorasManuales(nave._id, e.target.value)}
                            style={styles.inputManualHours}
                          />
                        )}
                      </td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: operativo ? '#e6f4ea' : '#fce8e6',
                          color: operativo ? '#137333' : '#c5221f'
                        }}>
                          {operativo ? 'E/S' : 'F/S'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA 2: ANALÍTICA */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>📊 Desglose Analítico de Horas</h2>
          
          <div style={styles.tabContainer}>
            <button 
              onClick={() => setTabActiva('aeronave')} 
              style={{...styles.tabButton, ...(tabActiva === 'aeronave' ? styles.tabButtonActive : {})}}
            >
              Por Aeronave
            </button>
            <button 
              onClick={() => setTabActiva('mision')} 
              style={{...styles.tabButton, ...(tabActiva === 'mision' ? styles.tabButtonActive : {})}}
            >
              Por Misión
            </button>
            <button 
              onClick={() => setTabActiva('fecha')} 
              style={{...styles.tabButton, ...(tabActiva === 'fecha' ? styles.tabButtonActive : {})}}
            >
              Por Mes / Período
            </button>
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto', paddingTop: '10px' }}>
            
            {tabActiva === 'aeronave' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Aeronave (Matrícula)</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Horas Voladas en Período</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingAeronaves.map((item, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={{...styles.td, fontWeight: 'bold'}}>{item.matricula}</td>
                      <td style={{...styles.td, textAlign: 'right', color: '#4f46e5', fontWeight: 'bold'}}>{item.horas} hs</td>
                    </tr>
                  ))}
                  {rankingAeronaves.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{...styles.td, textAlign: 'center', color: '#95a5a6'}}>No hay vuelos registrados en este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tabActiva === 'mision' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Misión de Vuelo / Tarea</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Horas Voladas</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingMisiones.map((item, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{item.mision}</td>
                      <td style={{...styles.td, textAlign: 'right', color: '#059669', fontWeight: 'bold'}}>{item.horas} hs</td>
                    </tr>
                  ))}
                  {rankingMisiones.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{...styles.td, textAlign: 'center', color: '#95a5a6'}}>No hay misiones registradas en este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tabActiva === 'fecha' && (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Mes / Año</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Horas Voladas</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingFechas.map((item, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={{...styles.td, textTransform: 'capitalize'}}>{item.mes}</td>
                      <td style={{...styles.td, textAlign: 'right', color: '#d97706', fontWeight: 'bold'}}>{item.horas} hs</td>
                    </tr>
                  ))}
                  {rankingFechas.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{...styles.td, textAlign: 'center', color: '#95a5a6'}}>No hay registros mensuales disponibles.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

// --- ESTILOS COMPACTOS PROTEGIDOS ---
const styles = {
  dashboardContainer: { padding: '15px 20px', width: '100%', boxSizing: 'border-box' },
  header: { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '2px' },
  title: { fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 },
  badgeUnidad: { backgroundColor: '#1b3a57', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
  subtitle: { fontSize: '0.8rem', color: '#64748b', margin: 0 },
  miniKpiRow: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' },
  miniKpiCard: { flex: '1 1 150px', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
  miniKpiIcon: { fontSize: '1.1rem', fontWeight: 'bold', color: '#1e40af' },
  miniKpiLabel: { display: 'block', fontSize: '0.65rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  miniKpiValue: { fontSize: '1rem', fontWeight: '800', color: '#1e293b' },
  filterBar: { backgroundColor: '#ffffff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' },
  filterGroup: { flex: '1', minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '4px' },
  filterLabel: { fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  select: { width: '100%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b', outline: 'none' },
  inputDate: { width: '100%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 8px', fontSize: '0.8rem', color: '#1e293b', outline: 'none' },
  btnClean: { color: '#3b82f6', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: '5px 10px' },
  tablesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '15px' },
  tableCard: { backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '15px' },
  tableTitle: { fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  tableHeaderRow: { backgroundColor: '#f1f5f9' },
  th: { padding: '8px', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px', fontSize: '0.8rem', color: '#334155' },
  statusBadge: { display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700' },
  tabContainer: { display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '10px', gap: '5px' },
  tabButton: { padding: '6px 12px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', marginBottom: '-2px', transition: '0.2s' },
  tabButtonActive: { color: '#1e3a57', borderBottom: '2px solid #1e3a57' },
  centerContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' },
  spinner: { width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid #1e3799', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  errorAlert: { backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '12px', borderRadius: '6px', margin: '15px 0' },
  btnRetry: { backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' },
  inputManualHours: { width: '80px', padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'right', backgroundColor: '#fff', outline: 'none', color: '#0f172a', fontWeight: 'bold' }
};

export default DashboardNovedades;