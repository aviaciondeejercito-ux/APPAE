import React, { useState, useEffect } from 'react';

const DashboardNovedades = () => {
  // --- ESTADOS ---
  const [novedades, setNovedades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros operativos
  const [sda, setSda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Pestaña activa para las métricas de horas
  const [tabActiva, setTabActiva] = useState('aeronave');

  // --- DETECTAR UNIDAD DEL USUARIO ---
  const unidadUsuario = localStorage.getItem('unidad') || 'B AV APY COMB 601';

  // --- CONFIGURACIÓN DE URL DINÁMICA ---
  const OBTENER_BASE_URL = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://appae.onrender.com';
  };

  // --- FUNCIÓN PARA CONSULTAR LA API ---
  const obtenerNovedades = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sda) params.append('sda', sda);
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      
      params.append('unidad', unidadUsuario);

      const token = localStorage.getItem('token'); 
      const BASE_URL = OBTENER_BASE_URL();
      const url = `${BASE_URL}/api/dashboard/novedades?${params.toString()}`;
      
      const respuesta = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  useEffect(() => {
    obtenerNovedades();
  }, [sda, fechaInicio, fechaFin]);

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginLeft: '15px', color: '#555', fontWeight: 'bold' }}>
          Sincronizando panel de novedades tácticas...
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

  // Filtrado de seguridad en Frontend
  const flotaFiltrada = resumenMantenimiento.detalleFlota.filter(
    nave => !nave.unidad || nave.unidad.toUpperCase() === unidadUsuario.toUpperCase()
  );

  // --- PROCESAMIENTO DINÁMICO DE DATOS PARA ANALÍTICA DE HORAS ---
  
  // 1. Horas acumuladas por Aeronave (Matrícula) en el período filtrado
  const horasPorAeronave = {};
  resumenVuelos.ultimosVuelos.forEach(v => {
    const mat = v.aeronave?.matricula || 'S/M';
    horasPorAeronave[mat] = (horasPorAeronave[mat] || 0) + (v.horasDelDia || 0);
  });
  const rankingAeronaves = Object.entries(horasPorAeronave)
    .map(([matricula, horas]) => ({ matricula, horas: Number(horas.toFixed(2)) }))
    .sort((a, b) => b.horas - a.horas);

  // 2. Horas acumuladas por Misión de Vuelo
  const horasPorMision = {};
  resumenVuelos.ultimosVuelos.forEach(v => {
    const mision = v.misionVuelo || 'Otras Operaciones';
    horasPorMision[mision] = (horasPorMision[mision] || 0) + (v.horasDelDia || 0);
  });
  const rankingMisiones = Object.entries(horasPorMision)
    .map(([mision, horas]) => ({ mision, horas: Number(horas.toFixed(2)) }))
    .sort((a, b) => b.horas - a.horas);

  // 3. Horas acumuladas por Mes del año actual
  const horasPorMes = {};
  resumenVuelos.ultimosVuelos.forEach(v => {
    if (!v.fecha) return;
    const fechaObj = new Date(v.fecha);
    const nombreMes = fechaObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    horasPorMes[nombreMes] = (horasPorMes[nombreMes] || 0) + (v.horasDelDia || 0);
  });
  const rankingFechas = Object.entries(horasPorMes)
    .map(([mes, horas]) => ({ mes, horas: Number(horas.toFixed(2)) }));

  return (
    <div style={styles.dashboardContainer}>
      
      {/* CABECERA REDUCIDA */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={styles.title}>Panel de Novedades</h1>
          <span style={styles.badgeUnidad}>{unidadUsuario}</span>
        </div>
        <p style={styles.subtitle}>Consolidado operativo y analítico de flota e historial F-13.</p>
      </div>

      {/* MINI KPIs: Ahora son súper compactos y ocupan una sola fila muy fina */}
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
            <span style={styles.miniKpiLabel}>Operativas</span>
            <span style={{...styles.miniKpiValue, color: '#059669'}}>
              {flotaFiltrada.filter(n => n.estado === 'En Servicio' || n.enServicio).length}
            </span>
          </div>
        </div>
        <div style={styles.miniKpiCard}>
          <span style={{...styles.miniKpiIcon, color: '#d97706'}}>🔧</span>
          <div>
            <span style={styles.miniKpiLabel}>En Mant.</span>
            <span style={{...styles.miniKpiValue, color: '#d97706'}}>
              {flotaFiltrada.filter(n => n.estado !== 'En Servicio' && !n.enServicio).length}
            </span>
          </div>
        </div>
        <div style={styles.miniKpiCard}>
          <span style={{...styles.miniKpiIcon, color: '#4f46e5'}}>⏱️</span>
          <div>
            <span style={styles.miniKpiLabel}>Total Horas</span>
            <span style={{...styles.miniKpiValue, color: '#4f46e5'}}>{resumenVuelos.totalHorasVoladas} hs</span>
          </div>
        </div>
      </div>

      {/* FILTROS OPERATIVOS */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>SDA</label>
          <select value={sda} onChange={(e) => setSda(e.target.value)} style={styles.select}>
            <option value="">Todos</option>
            <option value="HUEY">UH-1H Huey</option>
            <option value="SUPER_PUMA">Super Puma</option>
            <option value="BELL206">Bell 206</option>
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
        <button onClick={() => { setSda(''); setFechaInicio(''); setFechaFin(''); }} style={styles.btnClean}>
          Limpiar
        </button>
      </div>

      {/* CUADRO PRINCIPAL DEL TABLERO */}
      <div style={styles.tablesGrid}>
        
        {/* COLUMNA 1: ESTADO DE LA FLOTA (Lista compacta) */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>🛠️ Estado de la Flota</h2>
          <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Matrícula</th>
                  <th style={styles.th}>SDA</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Totales</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {flotaFiltrada.map((nave) => {
                  const operativo = nave.estado === 'En Servicio' || nave.enServicio;
                  return (
                    <tr key={nave._id} style={styles.tableRow}>
                      <td style={{...styles.td, fontWeight: 'bold'}}>{nave.matricula}</td>
                      <td style={styles.td}>{nave.sda}</td>
                      <td style={{...styles.td, textAlign: 'right'}}>{nave.horasTotales} hs</td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: operativo ? '#e6f4ea' : '#fce8e6',
                          color: operativo ? '#137333' : '#c5221f'
                        }}>
                          {operativo ? 'OPR' : 'INOP'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA 2: ANALÍTICA AVANZADA DE HORAS VOLADAS (Con Tabs) */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>📊 Desglose Analítico de Horas</h2>
          
          {/* BOTONES DE PESTAÑAS (TABS) */}
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

          {/* CONTENIDO DINÁMICO DE LA PESTAÑA SELECCIONADA */}
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

// --- ESTILOS CSS INLINE REESTRUCTURADOS Y COMPACTOS ---
const styles = {
  dashboardContainer: {
    padding: '15px 20px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1e293b',
    margin: 0
  },
  badgeUnidad: {
    backgroundColor: '#1b3a57',
    color: '#ffffff',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0
  },
  // Contenedor super reducido para los KPIs (ahora tipo insignias/pills)
  miniKpiRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '15px'
  },
  miniKpiCard: {
    flex: '1',
    minWidth: '140px',
    backgroundColor: '#ffffff',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  miniKpiIcon: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  miniKpiLabel: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  miniKpiValue: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#1e293b'
  },
  filterBar: {
    backgroundColor: '#ffffff',
    padding: '10px 15px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '15px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    alignItems: 'flex-end'
  },
  filterGroup: {
    flex: '1',
    minWidth: '130px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  filterLabel: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  select: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '0.8rem',
    color: '#1e293b',
    outline: 'none'
  },
  inputDate: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '5px 8px',
    fontSize: '0.8rem',
    color: '#1e293b',
    outline: 'none'
  },
  btnClean: {
    color: '#3b82f6',
    background: 'none',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '5px 10px'
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '15px'
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '15px'
  },
  tableTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 12px 0'
  },
  // Tablas compactas
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeaderRow: {
    backgroundColor: '#f1f5f9'
  },
  th: {
    padding: '8px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '8px',
    fontSize: '0.8rem',
    color: '#334155'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: '700'
  },
  // Sistema de pestañas (Tabs)
  tabContainer: {
    display: 'flex',
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '10px',
    gap: '5px'
  },
  tabButton: {
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-2px',
    transition: '0.2s'
  },
  tabButtonActive: {
    color: '#1e3a57',
    borderBottom: '2px solid #1e3a57'
  },
  centerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '250px'
  },
  spinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1e3799',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    borderLeft: '4px solid #ef4444',
    padding: '12px',
    borderRadius: '6px',
    margin: '15px 0'
  },
  btnRetry: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600'
  }
};

export default DashboardNovedades;