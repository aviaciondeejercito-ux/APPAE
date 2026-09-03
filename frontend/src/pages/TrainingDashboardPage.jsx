import React, { useEffect, useState } from 'react';

const API_BASE_URL = window.location.hostname === 'localhost' ? '' : 'https://appae.onrender.com';

const TrainingDashboardPage = () => {
    const [stats, setStats] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Obtener la unidad del usuario logueado
    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';

    useEffect(() => {
        const obtenerDatos = async () => {
            setCargando(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/training/dashboard-stats`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setStats(json.data);
                }
            } catch (error) {
                console.error("Error al cargar estadísticas:", error);
            } finally {
                setCargando(false);
            }
        };

        obtenerDatos();
    }, []);

    // Limpieza de datos: sin datos mock estáticos. 
    // Muestra solo registros reales filtrados por la unidad seleccionada si aplica.
    const dataDisplay = stats.filter(t => {
        if (!userUnidad) return true;
        const uTrip = (t.unidad || '').toUpperCase().trim();
        const uUser = userUnidad.toUpperCase().trim();
        return !uTrip || uTrip === uUser;
    });

    const maxProcedimientos = Math.max(
        ...dataDisplay.map(d => (d.totalVisual || 0) + (d.totalIFR || 0) + (d.totalNocturno || 0)), 
        1
    );

    return (
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', fontFamily: 'sans-serif', minHeight: '100vh' }}>
            <h2 style={{ backgroundColor: '#1b3a57', color: 'white', padding: '10px 15px', borderRadius: '4px', fontSize: '1rem', marginBottom: '15px' }}>
                📊 PANEL DE ESTADO DE ENTRENAMIENTO - ELEMENTO: {userUnidad || 'GENERAL'}
            </h2>

            {cargando ? (
                <div style={styles.stateCard}>⌛ Cargando estadísticas consolidadas...</div>
            ) : dataDisplay.length === 0 ? (
                <div style={styles.stateCard}>
                    ⚠️ No hay planillas de entrenamiento registradas aún para {userUnidad || 'esta unidad'}.
                </div>
            ) : (
                <>
                    {/* METRICAS KPI */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiTitle}>TOTAL TRIPULANTES EVALUADOS</span>
                            <span style={styles.kpiNum}>{dataDisplay.length}</span>
                        </div>
                        <div style={{ ...styles.kpiBox, borderLeft: '4px solid #27ae60' }}>
                            <span style={styles.kpiTitle}>ACUMULADO VISUAL</span>
                            <span style={styles.kpiNum}>{dataDisplay.reduce((acc, x) => acc + (x.totalVisual || 0), 0)}</span>
                        </div>
                        <div style={{ ...styles.kpiBox, borderLeft: '4px solid #2980b9' }}>
                            <span style={styles.kpiTitle}>ACUMULADO IFR</span>
                            <span style={styles.kpiNum}>{dataDisplay.reduce((acc, x) => acc + (x.totalIFR || 0), 0)}</span>
                        </div>
                        <div style={{ ...styles.kpiBox, borderLeft: '4px solid #8e44ad' }}>
                            <span style={styles.kpiTitle}>ACUMULADO NOCTURNO</span>
                            <span style={styles.kpiNum}>{dataDisplay.reduce((acc, x) => acc + (x.totalNocturno || 0), 0)}</span>
                        </div>
                    </div>

                    {/* GRÁFICO DE BARRAS ACUMULATIVAS */}
                    <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #ccc' }}>
                        <h3 style={{ fontSize: '0.85rem', color: '#333', marginBottom: '15px', marginTop: 0 }}>
                            📈 DISTRIBUCIÓN DE CUMPLIMIENTO POR TRIPULANTE
                        </h3>
                        
                        {dataDisplay.map((t, idx) => {
                            const v = t.totalVisual || 0;
                            const i = t.totalIFR || 0;
                            const n = t.totalNocturno || 0;
                            const total = v + i + n;
                            
                            const pctVisual = (v / maxProcedimientos) * 100;
                            const pctIFR = (i / maxProcedimientos) * 100;
                            const pctNocturno = (n / maxProcedimientos) * 100;

                            return (
                                <div key={t.tripulanteId || idx} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                                        <b>{t.nombre}</b>
                                        <span>{total} Maniobras ({t.totalVuelos} Vuelos)</span>
                                    </div>
                                    <div style={{ display: 'flex', height: '18px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pctVisual}%`, backgroundColor: '#27ae60' }} title={`Visual: ${v}`} />
                                        <div style={{ width: `${pctIFR}%`, backgroundColor: '#2980b9' }} title={`IFR: ${i}`} />
                                        <div style={{ width: `${pctNocturno}%`, backgroundColor: '#8e44ad' }} title={`Nocturno: ${n}`} />
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.7rem', marginTop: '10px', justifyContent: 'center' }}>
                            <span>🟩 Visual</span>
                            <span>🟦 IFR</span>
                            <span>🟪 Nocturno</span>
                        </div>
                    </div>

                    {/* TABLA DETALLADA CONSOLIDADAS */}
                    <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <h3 style={{ fontSize: '0.85rem', color: '#333', marginTop: 0 }}>📋 DETALLE DE REGISTROS CONSOLIDADOS</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginTop: '10px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                                    <th style={styles.th}>Tripulante</th>
                                    <th style={styles.th}>Vuelos Evaluados</th>
                                    <th style={styles.th}>Exigencias Visuales</th>
                                    <th style={styles.th}>Exigencias IFR</th>
                                    <th style={styles.th}>Exigencias Nocturnas</th>
                                    <th style={styles.th}>Total Procedimientos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataDisplay.map((row, i) => {
                                    const v = row.totalVisual || 0;
                                    const ifr = row.totalIFR || 0;
                                    const n = row.totalNocturno || 0;
                                    return (
                                        <tr key={row.tripulanteId || i} style={{ borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                            <td style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold' }}>{row.nombre}</td>
                                            <td style={styles.td}>{row.totalVuelos}</td>
                                            <td style={{ ...styles.td, color: '#27ae60', fontWeight: 'bold' }}>{v}</td>
                                            <td style={{ ...styles.td, color: '#2980b9', fontWeight: 'bold' }}>{ifr}</td>
                                            <td style={{ ...styles.td, color: '#8e44ad', fontWeight: 'bold' }}>{n}</td>
                                            <td style={{ ...styles.td, backgroundColor: '#f0f3f4', fontWeight: 'bold' }}>
                                                {v + ifr + n}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

const styles = {
    kpiBox: { backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', borderLeft: '4px solid #1b3a57', display: 'flex', flexDirection: 'column' },
    kpiTitle: { fontSize: '0.65rem', color: '#777', fontWeight: 'bold' },
    kpiNum: { fontSize: '1.4rem', fontWeight: 'bold', marginTop: '2px' },
    stateCard: { backgroundColor: 'white', padding: '30px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc', color: '#555', fontSize: '0.9rem' },
    th: { padding: '8px', border: '1px solid #ddd' },
    td: { padding: '8px', border: '1px solid #ddd' }
};

export default TrainingDashboardPage;