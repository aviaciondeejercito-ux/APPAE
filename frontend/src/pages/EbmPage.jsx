import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const EBM = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Configuración Sincro Joker
    const unidadUsuario = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';
    const anioActual = 2026;

    const [unidadFiltro, setUnidadFiltro] = useState(unidadUsuario);
    const [sdaSeleccionado, setSdaSeleccionado] = useState('');

    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'user';
    const role = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const puedeCambiarUnidad = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(role);

    const unidadesDisponibles = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
        "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
        "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"
    ];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/ebm/planificacion-completa`, {
                params: {
                    unidad: puedeCambiarUnidad ? unidadFiltro : unidadUsuario,
                    anio: anioActual
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            setDatos(response.data);
            
            // Auto-selección inteligente del Sistema de Armas
            if (response.data.length > 0 && !sdaSeleccionado) {
                const sdas = new Set();
                response.data.forEach(p => p.habilitaciones?.forEach(h => {
                    if (h.aeronave) sdas.add(h.aeronave);
                }));
                const lista = Array.from(sdas).sort();
                if (lista.length > 0) setSdaSeleccionado(lista[0]);
            }
        } catch (error) {
            console.error("❌ Error en carga EBM:", error);
        } finally {
            setLoading(false);
        }
    }, [unidadFiltro, unidadUsuario, puedeCambiarUnidad, sdaSeleccionado]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const sdasEnUnidad = useMemo(() => {
        const sistemas = new Set();
        datos.forEach(p => p.habilitaciones?.forEach(h => {
            if (h.aeronave) sistemas.add(h.aeronave);
        }));
        return Array.from(sistemas).sort();
    }, [datos]);

    const pilotosFiltrados = useMemo(() => {
        if (!sdaSeleccionado) return [];
        return datos.filter(p => p.habilitaciones?.some(h => h.aeronave === sdaSeleccionado));
    }, [datos, sdaSeleccionado]);

    if (loading) return <div style={styles.loading}>📊 Sincronizando Horas de Vuelo AE...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <h1 style={styles.titulo}>REGISTRO TRIMESTRAL DE HORAS {anioActual}</h1>
                    <p style={styles.subtitulo}>Unidad: {unidadFiltro}</p>
                </div>
                <div style={styles.filtrosBox}>
                    {puedeCambiarUnidad && (
                        <div style={styles.field}>
                            <label style={styles.label}>CAMBIAR UNIDAD:</label>
                            <select value={unidadFiltro} onChange={(e) => setUnidadFiltro(e.target.value)} style={styles.select}>
                                {unidadesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={styles.field}>
                        <label style={styles.label}>SISTEMA DE ARMAS:</label>
                        <select value={sdaSeleccionado} onChange={(e) => setSdaSeleccionado(e.target.value)} style={styles.selectSda}>
                            {sdasEnUnidad.map(s => <option key={s} value={s}>{s}</option>)}
                            {sdasEnUnidad.length === 0 && <option>Sin habilitaciones</option>}
                        </select>
                    </div>
                </div>
            </header>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>GRADO Y APELLIDO</th>
                            <th style={styles.th}>SISTEMA</th>
                            <th style={styles.th}>1er TRIM</th>
                            <th style={styles.th}>2do TRIM</th>
                            <th style={styles.th}>3er TRIM</th>
                            <th style={styles.th}>4to TRIM</th>
                            <th style={{...styles.th, backgroundColor: '#1a2a3a'}}>TOTAL ANUAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pilotosFiltrados.length > 0 ? pilotosFiltrados.map(p => {
                            const total = p.horasReales.reduce((a, b) => a + b, 0);
                            return (
                                <tr key={p._id} style={styles.row}>
                                    <td style={styles.td}>
                                        <span style={styles.grado}>{p.grado}</span> {p.apellido}, {p.nombre}
                                    </td>
                                    <td style={{...styles.td, color: '#888'}}>{sdaSeleccionado}</td>
                                    <td style={styles.tdHoras}>{p.horasReales[0].toFixed(1)}</td>
                                    <td style={styles.tdHoras}>{p.horasReales[1].toFixed(1)}</td>
                                    <td style={styles.tdHoras}>{p.horasReales[2].toFixed(1)}</td>
                                    <td style={styles.tdHoras}>{p.horasReales[3].toFixed(1)}</td>
                                    <td style={styles.tdTotal}>{total.toFixed(1)} hs</td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan="7" style={styles.noData}>No se encontraron oficiales habilitados en {sdaSeleccionado}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '30px', backgroundColor: '#0f0f0f', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'monospace' },
    loading: { color: '#00ff00', textAlign: 'center', marginTop: '100px', fontSize: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' },
    titulo: { fontSize: '22px', color: '#fff', margin: 0, letterSpacing: '1px' },
    subtitulo: { fontSize: '14px', color: '#00ff00', margin: '5px 0 0 0' },
    filtrosBox: { display: 'flex', gap: '20px' },
    field: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '10px', color: '#888', fontWeight: 'bold' },
    select: { backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '4px' },
    selectSda: { backgroundColor: '#1a2a3a', color: '#00ff00', border: '1px solid #00ff00', padding: '8px', borderRadius: '4px', fontWeight: 'bold' },
    tableWrapper: { backgroundColor: '#161616', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '15px', textAlign: 'left', borderBottom: '2px solid #333', fontSize: '12px', color: '#aaa', textTransform: 'uppercase' },
    td: { padding: '15px', borderBottom: '1px solid #222', fontSize: '14px' },
    tdHoras: { padding: '15px', borderBottom: '1px solid #222', textAlign: 'center', fontWeight: 'bold', color: '#ccc' },
    tdTotal: { padding: '15px', borderBottom: '1px solid #222', textAlign: 'center', fontWeight: 'bold', color: '#00ff00', backgroundColor: 'rgba(0,255,0,0.05)' },
    grado: { color: '#00ff00', fontWeight: 'bold', marginRight: '5px' },
    noData: { padding: '40px', textAlign: 'center', color: '#555', fontStyle: 'italic' }
};

export default EBM;