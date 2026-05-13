import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const EBM = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const unidadUsuario = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';
    const anioActual = 2026;

    const [unidadFiltro, setUnidadFiltro] = useState(unidadUsuario);
    const [sdaSeleccionado, setSdaSeleccionado] = useState('');

    const role = (localStorage.getItem('role') || 'user').toUpperCase();
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
            
            // Auto-selección de SdA (C-208, etc)
            if (response.data.length > 0 && !sdaSeleccionado) {
                const sdas = new Set();
                response.data.forEach(p => p.habilitaciones?.forEach(h => sdas.add(h.aeronave)));
                const lista = Array.from(sdas).sort();
                if (lista.length > 0) setSdaSeleccionado(lista[0]);
            }
        } catch (error) {
            console.error("❌ Error EBM:", error);
        } finally {
            setLoading(false);
        }
    }, [unidadFiltro, unidadUsuario, puedeCambiarUnidad, sdaSeleccionado]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const sdasEnUnidad = useMemo(() => {
        const sistemas = new Set();
        datos.forEach(p => p.habilitaciones?.forEach(h => sistemas.add(h.aeronave)));
        return Array.from(sistemas).sort();
    }, [datos]);

    const pilotosFiltrados = useMemo(() => {
        if (!sdaSeleccionado) return [];
        return datos.filter(p => p.habilitaciones?.some(h => h.aeronave === sdaSeleccionado));
    }, [datos, sdaSeleccionado]);

    if (loading) return <div style={styles.loading}>Cargando Oficiales y Horas...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.titulo}>HORAS DE VUELO POR TRIMESTRE {anioActual}</h1>
                <div style={styles.filtrosBox}>
                    {puedeCambiarUnidad && (
                        <select value={unidadFiltro} onChange={(e) => setUnidadFiltro(e.target.value)} style={styles.select}>
                            {unidadesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    )}
                    <select value={sdaSeleccionado} onChange={(e) => setSdaSeleccionado(e.target.value)} style={styles.selectSda}>
                        {sdasEnUnidad.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </header>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>GRADO Y APELLIDO</th>
                            <th style={styles.th}>SdA</th>
                            <th style={styles.th}>1er TRIM</th>
                            <th style={styles.th}>2do TRIM</th>
                            <th style={styles.th}>3er TRIM</th>
                            <th style={styles.th}>4to TRIM</th>
                            <th style={styles.th}>TOTAL ANUAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pilotosFiltrados.map(p => {
                            const totalAnual = p.horasReales.reduce((a, b) => a + b, 0);
                            return (
                                <tr key={p._id} style={styles.row}>
                                    <td style={styles.td}><b>{p.grado}</b> {p.apellido}</td>
                                    <td style={styles.td}>{sdaSeleccionado}</td>
                                    <td style={styles.tdHoras}>{p.horasReales[0]} hs</td>
                                    <td style={styles.tdHoras}>{p.horasReales[1]} hs</td>
                                    <td style={styles.tdHoras}>{p.horasReales[2]} hs</td>
                                    <td style={styles.tdHoras}>{p.horasReales[3]} hs</td>
                                    <td style={{...styles.tdHoras, color: '#00ff00'}}>{totalAnual} hs</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#e0e0e0' },
    loading: { color: '#00ff00', textAlign: 'center', marginTop: '50px' },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
    titulo: { fontSize: '18px', color: '#fff' },
    filtrosBox: { display: 'flex', gap: '10px' },
    select: { backgroundColor: '#222', color: '#fff', padding: '5px' },
    selectSda: { backgroundColor: '#1a2a3a', color: '#00ff00', padding: '5px', fontWeight: 'bold' },
    tableWrapper: { backgroundColor: '#1e1e1e', borderRadius: '5px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px', border: '1px solid #333', backgroundColor: '#252525', fontSize: '12px' },
    td: { padding: '10px', border: '1px solid #333', fontSize: '13px' },
    tdHoras: { padding: '10px', border: '1px solid #333', textAlign: 'center', fontWeight: 'bold' },
    row: { borderBottom: '1px solid #333' }
};

export default EBM;