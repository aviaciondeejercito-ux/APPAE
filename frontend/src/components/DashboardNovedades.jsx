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

  // --- DETECTAR UNIDAD DEL USUARIO ---
  // Extraemos la unidad del localStorage (comúnmente guardada al hacer login bajo 'unidad' o 'elemento')
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
      
      // 🛡️ FILTRO CLAVE: Forzamos que solo consulte la información de TU unidad
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

  // Filtrado secundario en Frontend por seguridad: garantizamos mostrar solo aeronaves de tu unidad
  const flotaFiltrada = resumenMantenimiento.detalleFlota.filter(
    nave => !nave.unidad || nave.unidad.toUpperCase() === unidadUsuario.toUpperCase()
  );

  return (
    <div style={styles.dashboardContainer}>
      
      {/* CABECERA */}
      <div style={styles.header}>
        <h1 style={styles.title}>Panel de Novedades del Elemento</h1>
        <div style={styles.badgeUnidad}>{unidadUsuario}</div>
        <p style={styles.subtitle}>
          Consolidado operativo: Estado de flota e historial de horas voladas (F-13) exclusivo de la unidad.
        </p>
      </div>

      {/* BARRA DE FILTROS TÁCTICOS */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>SISTEMA DE ARMAS (SDA)</label>
          <select 
            value={sda} 
            onChange={(e) => setSda(e.target.value)}
            style={styles.select}
          >
            <option value="">Todos los Sistemas</option>
            <option value="HUEY">UH-1H Huey</option>
            <option value="SUPER_PUMA">Super Puma</option>
            <option value="BELL206">Bell 206</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>DESDE</label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)}
            style={styles.inputDate}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>HASTA</label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)}
            style={styles.inputDate}
          />
        </div>

        <button 
          onClick={() => { setSda(''); setFechaInicio(''); setFechaFin(''); }}
          style={styles.btnClean}
        >
          Limpiar Filtros
        </button>
      </div>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div style={styles.kpiGrid}>
        
        <div style={styles.kpiCard}>
          <div>
            <p style={styles.kpiLabel}>Aeronaves Asignadas</p>
            <h3 style={styles.kpiValue}>{flotaFiltrada.length}</h3>
          </div>
          <div style={{...styles.kpiIcon, backgroundColor: '#ebf5ff', color: '#1e40af'}}>✈️</div>
        </div>

        <div style={styles.kpiCard}>
          <div>
            <p style={styles.kpiLabel}>En Servicio (Operativas)</p>
            <h3 style={{...styles.kpiValue, color: '#059669'}}>
              {flotaFiltrada.filter(n => n.estado === 'En Servicio' || n.enServicio).length}
            </h3>
          </div>
          <div style={{...styles.kpiIcon, backgroundColor: '#ecfdf5', color: '#065f46'}}>✓</div>
        </div>

        <div style={styles.kpiCard}>
          <div>
            <p style={styles.kpiLabel}>En Mantenimiento</p>
            <h3 style={{...styles.kpiValue, color: '#d97706'}}>
              {flotaFiltrada.filter(n => n.estado !== 'En Servicio' && !n.enServicio).length}
            </h3>
          </div>
          <div style={{...styles.kpiIcon, backgroundColor: '#fffbeb', color: '#92400e'}}>🔧</div>
        </div>

        <div style={styles.kpiCard}>
          <div>
            <p style={styles.kpiLabel}>Horas Voladas (Período)</p>
            <h3 style={{...styles.kpiValue, color: '#4f46e5'}}>{resumenVuelos.totalHorasVoladas} hs</h3>
          </div>
          <div style={{...styles.kpiIcon, backgroundColor: '#eef2ff', color: '#3730a3'}}>⏱️</div>
        </div>

      </div>

      {/* TABLAS DE INFORMACIÓN */}
      <div style={styles.tablesGrid}>
        
        {/* COLUMNA 1: ESTADO DE LA FLOTA */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>
            <span style={{ marginRight: '8px' }}>🛠️</span> Estado Actual de la Flota ({unidadUsuario})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Matrícula</th>
                  <th style={styles.th}>Modelo / SDA</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Horas Totales</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {flotaFiltrada.map((nave) => {
                  const operativo = nave.estado === 'En Servicio' || nave.enServicio;
                  return (
                    <tr key={nave._id} style={styles.tableRow}>
                      <td style={{...styles.td, fontWeight: 'bold', color: '#2c3e50'}}>{nave.matricula}</td>
                      <td style={styles.td}>
                        {nave.modelo} <span style={{ color: '#95a5a6', fontSize: '0.8rem' }}>({nave.sda})</span>
                      </td>
                      <td style={{...styles.td, textAlign: 'right', fontWeight: '500'}}>{nave.horasTotales} hs</td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: operativo ? '#d1fae5' : '#fee2e2',
                          color: operativo ? '#065f46' : '#991b1b'
                        }}>
                          {operativo ? 'OPERATIVO' : 'INOPERATIVO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {flotaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#7f8c8d', padding: '20px'}}>
                      No se encontraron aeronaves registradas para este elemento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA 2: REGISTRO DE VUELOS F-13 */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>
            <span style={{ marginRight: '8px' }}>📝</span> Últimos Vuelos Registrados (F-13)
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Aeronave</th>
                  <th style={styles.th}>Misión / Tripulación</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Horas</th>
                </tr>
              </thead>
              <tbody>
                {resumenVuelos.ultimosVuelos.slice(0, 10).map((vuelo) => (
                  <tr key={vuelo._id} style={styles.tableRow}>
                    <td style={{...styles.td, color: '#7f8c8d', fontSize: '0.8rem'}}>
                      {new Date(vuelo.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td style={{...styles.td, fontWeight: 'bold', color: '#2c3e50'}}>
                      {vuelo.aeronave?.matricula || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <div style={{fontWeight: '600', color: '#34495e', fontSize: '0.85rem'}}>{vuelo.misionVuelo}</div>
                      <div style={{fontSize: '0.75rem', color: '#95a5a6'}}>Cmdte: {vuelo.comandante} | Mec: {vuelo.mecanico}</div>
                    </td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#4f46e5'}}>
                      +{vuelo.horasDelDia} hs
                    </td>
                  </tr>
                ))}
                {resumenVuelos.ultimosVuelos.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#7f8c8d', padding: '20px'}}>
                      No se encontraron reportes de vuelo en este período.
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

// --- DISEÑO CSS INLINE CENTRALIZADO (Para no depender de Tailwind) ---
const styles = {
  dashboardContainer: {
    padding: '25px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    marginBottom: '25px',
    position: 'relative'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  badgeUnidad: {
    display: 'inline-block',
    backgroundColor: '#1b3a57',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0
  },
  filterBar: {
    backgroundColor: '#ffffff',
    padding: '18px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    marginBottom: '25px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'flex-end'
  },
  filterGroup: {
    flex: '1',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  filterLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  select: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '0.9rem',
    outline: 'none',
    color: '#1e293b'
  },
  inputDate: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '0.9rem',
    outline: 'none',
    color: '#1e293b'
  },
  btnClean: {
    color: '#3b82f6',
    background: 'none',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    height: '40px',
    padding: '0 15px',
    transition: '0.2s'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  kpiLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 5px 0'
  },
  kpiValue: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#1e293b',
    margin: 0
  },
  kpiIcon: {
    width: '45px',
    height: '45px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '25px'
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    padding: '20px'
  },
  tableTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 15px 0',
    display: 'flex',
    alignItems: 'center'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeaderRow: {
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '12px 10px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '12px 10px',
    fontSize: '0.85rem',
    color: '#334155',
    verticalAlign: 'middle'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.3px'
  },
  centerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '300px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e3799',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    borderLeft: '4px solid #ef4444',
    padding: '15px',
    borderRadius: '6px',
    margin: '20px 0'
  },
  btnRetry: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600'
  }
};

export default DashboardNovedades;