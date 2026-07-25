import React, { useState } from 'react';

// Si tenés instalado recharts / chart.js podés importar los componentes visuales.
// En esta vista integramos widgets de métricas clave (KPIs), tablas comparativas 
// y contenedores listos para renderizar tus gráficos.

const DashboardEscuela = () => {
    const [filtroPromocion, setFiltroPromocion] = useState('2026');
    const [filtroEspecialidad, setFiltroEspecialidad] = useState('TODAS');

    // MOCK DATA DE RENDIMIENTO GENERAL
    const statsGenerales = {
        totalAlumnos: 28,
        horasVoladasMes: 342.5,
        promedioGeneralAcademico: 8.4,
        aptitudPsicoApto: 25,
        aptitudPsicoObservado: 3,
        promedioFisico: 8.8
    };

    const rankingAlumnos = [
        { id: '1', nombre: 'Tte. Juan Pérez', curso: 'Piloto Aviación', promedioVuelo: 4.8, promedioAcademico: 9.1, aptitudPsico: 'APTO', promedioFisico: 9.5, estado: 'DESTACADO' },
        { id: '2', nombre: 'Subtte. María González', curso: 'Piloto Aviación', promedioVuelo: 4.5, promedioAcademico: 8.8, aptitudPsico: 'APTO', promedioFisico: 8.9, estado: 'SATISFACTORIO' },
        { id: '3', nombre: 'Sarg. Carlos Rodríguez', curso: 'Mecánico Navegante', promedioVuelo: 4.2, promedioAcademico: 8.0, aptitudPsico: 'APTO', promedioFisico: 8.2, estado: 'SATISFACTORIO' },
        { id: '4', nombre: 'Tte. Lucas Benítez', curso: 'Piloto Aviación', promedioVuelo: 2.8, promedioAcademico: 6.5, aptitudPsico: 'OBSERVADO', promedioFisico: 7.0, estado: 'EN_RIESGO' },
    ];

    const desempInstructores = [
        { nombre: 'Cap. Esteban Quito', horasInstruccion: 68.5, fichasEvaluadas: 42, promedioOtorgado: 4.2 },
        { nombre: 'My. Roberto Gómez', horasInstruccion: 54.0, fichasEvaluadas: 35, promedioOtorgado: 4.5 },
        { nombre: 'Tte 1ro. Javier Rossi', horasInstruccion: 72.0, fichasEvaluadas: 48, promedioOtorgado: 3.9 },
    ];

    const getEstadoBadgeStyle = (estado) => {
        switch(estado) {
            case 'DESTACADO': return { background: '#d4edda', color: '#155724', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' };
            case 'SATISFACTORIO': return { background: '#cce5ff', color: '#004085', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' };
            case 'EN_RIESGO': return { background: '#f8d7da', color: '#721c24', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' };
            default: return {};
        }
    };

    return (
        <div style={styles.container}>
            {/* CABECERA Y FILTROS GENERALES */}
            <div style={styles.header}>
                <h2 style={styles.title}>📊 DASHBOARD DE RENDIMIENTO GENERAL — ESCUELA DE AVIACIÓN</h2>
                <div style={styles.filterGroup}>
                    <select style={styles.selectFilter} value={filtroPromocion} onChange={e => setFiltroPromocion(e.target.value)}>
                        <option value="2026">Promoción 2026</option>
                        <option value="2025">Promoción 2025</option>
                    </select>
                    <select style={styles.selectFilter} value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)}>
                        <option value="TODAS">Todas las Especialidades</option>
                        <option value="PILOTOS">Pilotos de Aviación</option>
                        <option value="MECANICOS">Mecánicos / Tripulantes</option>
                    </select>
                </div>
            </div>

            {/* TARJETAS KPI (MÉTRICAS CLAVE) */}
            <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>🎓 Total Alumnos</span>
                    <span style={styles.kpiValue}>{statsGenerales.totalAlumnos}</span>
                    <span style={styles.kpiSub}>Activos en Curso</span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>✈️ Hs Voladas (Mes)</span>
                    <span style={{ ...styles.kpiValue, color: '#2980b9' }}>{statsGenerales.horasVoladasMes} Hs</span>
                    <span style={styles.kpiSub}>Instrucción Práctica</span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>📚 Promedio Académico</span>
                    <span style={{ ...styles.kpiValue, color: '#27ae60' }}>{statsGenerales.promedioGeneralAcademico} / 10</span>
                    <span style={styles.kpiSub}>Exámenes y TPs</span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>🧠 Aptitud Psicotécnica</span>
                    <span style={{ ...styles.kpiValue, color: '#e67e22' }}>{statsGenerales.aptitudPsicoApto} <small style={{fontSize: '0.9rem', color: '#7f8c8d'}}>/ {statsGenerales.totalAlumnos} Aptos</small></span>
                    <span style={styles.kpiSub}>{statsGenerales.aptitudPsicoObservado} en seguimiento</span>
                </div>
            </div>

            {/* SECCIÓN DE GRÁFICOS (MOCK / CONTENEDORES) */}
            <div style={styles.chartsGrid}>
                <div style={styles.chartCard}>
                    <h3 style={styles.cardTitle}>📈 Evolución Comparativa de Calificaciones (Vuelo vs Académico)</h3>
                    <div style={styles.chartPlaceholder}>
                        <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>
                            [ Gráfico de Líneas Temporal: Evolución promedio de notas de Vuelo y Académicas por mes ]
                        </p>
                    </div>
                </div>
                <div style={styles.chartCard}>
                    <h3 style={styles.cardTitle}>🎯 Distribución por Nivel de Rendimiento de Vuelo</h3>
                    <div style={styles.chartPlaceholder}>
                        <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>
                            [ Gráfico Donut / Torta: Sobresaliente (30%), Satisfactorio (55%), Requiere Refuerzo (15%) ]
                        </p>
                    </div>
                </div>
            </div>

            {/* TABLAS DETALLADAS */}
            <div style={styles.tablesGrid}>
                {/* RANKING GENERAL DE ALUMNOS */}
                <div style={styles.tableCard}>
                    <h3 style={styles.cardTitle}>📋 Rendimiento Individual Alumnos</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>Alumno</th>
                                <th style={styles.th}>Especialidad</th>
                                <th style={styles.th}>Prom. Vuelo (1-5)</th>
                                <th style={styles.th}>Prom. Académico</th>
                                <th style={styles.th}>Psicotécnico</th>
                                <th style={styles.th}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankingAlumnos.map(al => (
                                <tr key={al.id} style={styles.tr}>
                                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{al.nombre}</td>
                                    <td style={styles.td}>{al.curso}</td>
                                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>{al.promedioVuelo}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>{al.promedioAcademico}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <span style={{ color: al.aptitudPsico === 'APTO' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                            {al.aptitudPsico}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={getEstadoBadgeStyle(al.estado)}>{al.estado}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* DESEMPEÑO DE INSTRUCTORES */}
                <div style={styles.tableCard}>
                    <h3 style={styles.cardTitle}>👨‍✈️ Carga y Desempeño de Instructores</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>Instructor</th>
                                <th style={styles.th}>Hs Voladas C/Alumno</th>
                                <th style={styles.th}>Fichas Llenadas</th>
                                <th style={styles.th}>Prom. Calificaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {desempInstructores.map((ins, idx) => (
                                <tr key={idx} style={styles.tr}>
                                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{ins.nombre}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>{ins.horasInstruccion} Hs</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>{ins.fichasEvaluadas}</td>
                                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>{ins.promedioOtorgado} / 5</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b2a4a', padding: '15px 20px', borderRadius: '6px', color: '#fff', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    title: { fontSize: '1.1rem', margin: 0, fontWeight: 'bold' },
    filterGroup: { display: 'flex', gap: '10px' },
    selectFilter: { padding: '6px 12px', borderRadius: '4px', border: 'none', fontWeight: 'bold', fontSize: '0.8rem' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px' },
    kpiCard: { background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #dcdfe6', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' },
    kpiTitle: { fontSize: '0.75rem', fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase' },
    kpiValue: { fontSize: '1.6rem', fontWeight: 'bold', color: '#2c3e50', margin: '5px 0' },
    kpiSub: { fontSize: '0.7rem', color: '#95a5a6' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' },
    chartCard: { background: '#fff', padding: '20px', borderRadius: '6px', border: '1px solid #dcdfe6', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' },
    cardTitle: { fontSize: '0.9rem', color: '#1b2a4a', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: 0, marginBottom: '15px' },
    chartPlaceholder: { background: '#f8fafc', height: '220px', borderRadius: '6px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' },
    tablesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' },
    tableCard: { background: '#fff', padding: '20px', borderRadius: '6px', border: '1px solid #dcdfe6', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
    thRow: { background: '#edf2f7', textAlign: 'left' },
    th: { padding: '8px 10px', color: '#4a5568', fontWeight: 'bold', borderBottom: '2px solid #cbd5e1' },
    tr: { borderBottom: '1px solid #edf2f7' },
    td: { padding: '8px 10px', color: '#2d3748' }
};

export default DashboardEscuela;