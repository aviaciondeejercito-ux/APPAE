import React, { useEffect, useState } from 'react';

const API_BASE_URL = window.location.hostname === 'localhost' ? '' : 'https://appae.onrender.com';

const TrainingDashboardPage = () => {
    const [stats, setStats] = useState([]);

    useEffect(() => {
        // Cargar estadísticas
        fetch(`${API_BASE_URL}/api/training/dashboard-stats`)
            .then(res => res.json())
            .then(res => { if (res.success) setStats(res.data); })
            .catch(() => console.log("Cargando datos estáticos de muestra..."));
    }, []);

    // Datos estáticos de respaldo para visualización inmediata
    const dataDisplay = stats.length > 0 ? stats : [
        { nombre: 'Cap. Juan Pérez', totalVuelos: 12, totalVisual: 28, totalIFR: 14, totalNocturno: 6 },
        { nombre: 'Tte. María González', totalVuelos: 8, totalVisual: 18, totalIFR: 9, totalNocturno: 4 },
        { nombre: 'Subt. Carlos Rodríguez', totalVuelos: 5, totalVisual: 10, totalIFR: 2, totalNocturno: 1 }
    ];

    const maxProcedimientos = Math.max(...dataDisplay.map(d => d.totalVisual + d.totalIFR + d.totalNocturno), 1);

    return (
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', fontFamily: 'monospace' }}>
            <h2 style={{ backgroundColor: '#1b3a57', color: 'white', padding: '10px', borderRadius: '4px' }}>
                📊 PANEL DE ESTADO DE ENTRENAMIENTO DE TRIPULANTES
            </h2>

            {/* METRICAS KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                <div style={styles.kpiBox}>
                    <span style={styles.kpiTitle}>TOTAL TRIPULANTES</span>
                    <span style={styles.kpiNum}>{dataDisplay.length}</span>
                </div>
                <div style={{ ...styles.kpiBox, borderLeft: '4px solid #27ae60' }}>
                    <span style={styles.kpiTitle}>ACUMULADO VISUAL</span>
                    <span style={styles.kpiNum}>{dataDisplay.reduce((acc, x) => acc + x.totalVisual, 0)}</span>
                </div>
                <div style={{ ...styles.kpiBox, borderLeft: '4px solid #2980b9' }}>
                    <span style={styles.kpiTitle}>ACUMULADO IFR</span>
                    <span style={styles.kpiNum}>{dataDisplay.reduce((acc, x) => acc + x.totalIFR, 0)}</span>
                </div>
                <div style={{ ...styles.kpiBox, borderLeft: '4px solid #8e44ad' }}>
                    <span style={styles.kpiTitle}>ACUMULADO NOCTURNO</span>
                    <span style={styles.kpiNum}>{dataDisplay.reduce((acc, x) => acc + x.totalNocturno, 0)}</span>
                </div>
            </div>

            {/* GRÁFICO SVG PERSONALIZADO / BARRAS ACUMULATIVAS */}
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #ccc' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#333', marginBottom: '15px' }}>📈 DISTRIBUCIÓN DE CUMPLIMIENTO POR TRIPULANTE</h3>
                
                {dataDisplay.map((t, idx) => {
                    const total = t.totalVisual + t.totalIFR + t.totalNocturno;
                    const pctVisual = (t.totalVisual / maxProcedimientos) * 100;
                    const pctIFR = (t.totalIFR / maxProcedimientos) * 100;
                    const pctNocturno = (t.totalNocturno / maxProcedimientos) * 100;

                    return (
                        <div key={idx} style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                                <b>{t.nombre}</b>
                                <span>{total} Procedimientos Totales ({t.totalVuelos} Vuelos)</span>
                            </div>
                            {/* Barra Apilada */}
                            <div style={{ display: 'flex', height: '18px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pctVisual}%`, backgroundColor: '#27ae60' }} title={`Visual: ${t.totalVisual}`} />
                                <div style={{ width: `${pctIFR}%`, backgroundColor: '#2980b9' }} title={`IFR: ${t.totalIFR}`} />
                                <div style={{ width: `${pctNocturno}%`, backgroundColor: '#8e44ad' }} title={`Nocturno: ${t.totalNocturno}`} />
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

            {/* TABLA DETALLADA */}
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#333' }}>📋 DETALLE DE REGISTROS CONSOLIDADOS</h3>
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
                        {dataDisplay.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                <td style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold' }}>{row.nombre}</td>
                                <td style={styles.td}>{row.totalVuelos}</td>
                                <td style={{ ...styles.td, color: '#27ae60', fontWeight: 'bold' }}>{row.totalVisual}</td>
                                <td style={{ ...styles.td, color: '#2980b9', fontWeight: 'bold' }}>{row.totalIFR}</td>
                                <td style={{ ...styles.td, color: '#8e44ad', fontWeight: 'bold' }}>{row.totalNocturno}</td>
                                <td style={{ ...styles.td, backgroundColor: '#f0f3f4', fontWeight: 'bold' }}>
                                    {row.totalVisual + row.totalIFR + row.totalNocturno}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    kpiBox: { backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', borderLeft: '4px solid #1b3a57', display: 'flex', flexDirection: 'column' },
    kpiTitle: { fontSize: '0.65rem', color: '#777', fontWeight: 'bold' },
    kpiNum: { fontSize: '1.4rem', fontWeight: 'bold', marginTop: '2px' },
    th: { padding: '8px', border: '1px solid #ddd' },
    td: { padding: '8px', border: '1px solid #ddd' }
};

export default TrainingDashboardPage;