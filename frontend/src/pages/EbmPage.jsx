import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const EBM = () => {
    const [pilotos, setPilotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unidadFiltro, setUnidadFiltro] = useState(localStorage.getItem('elemento') || '');

    const role = (localStorage.getItem('role') || '').toUpperCase();
    const esAdmin = role === 'ADMIN';

    const fetchPilotos = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/ebm/planificacion-completa', {
                params: { unidad: unidadFiltro },
                headers: { Authorization: `Bearer ${token}` }
            });
            setPilotos(res.data);
        } catch (err) {
            console.error("Error al cargar pilotos:", err);
        } finally {
            setLoading(false);
        }
    }, [unidadFiltro]);

    useEffect(() => { fetchPilotos(); }, [fetchPilotos]);

    if (loading) return <div style={styles.info}>Cargando nómina de oficiales...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2>NÓMINA DE PILOTOS - EBM</h2>
                {esAdmin && (
                    <select 
                        value={unidadFiltro} 
                        onChange={(e) => setUnidadFiltro(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">TODAS LAS UNIDADES</option>
                        <option value="B HELIC ASAL 601">B HELIC ASAL 601</option>
                        <option value="B AV APY COMB 601">B AV APY COMB 601</option>
                        {/* Agregar más unidades según necesidad */}
                    </select>
                )}
            </header>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>GRADO</th>
                        <th style={styles.th}>APELLIDO</th>
                        <th style={styles.th}>NOMBRE</th>
                        <th style={styles.th}>UNIDAD / ELEMENTO</th>
                    </tr>
                </thead>
                <tbody>
                    {pilotos.map(p => (
                        <tr key={p._id} style={styles.tr}>
                            <td style={styles.td}><b>{p.grado}</b></td>
                            <td style={styles.td}>{p.apellido}</td>
                            <td style={styles.td}>{p.nombre}</td>
                            <td style={styles.td}>{p.elemento || p.unidad}</td>
                        </tr>
                    ))}
                    {pilotos.length === 0 && (
                        <tr><td colSpan="4" style={styles.tdEmpty}>No hay pilotos registrados</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' },
    select: { backgroundColor: '#222', color: '#0f0', border: '1px solid #0f0', padding: '5px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #444', color: '#888', fontSize: '12px' },
    td: { padding: '12px', borderBottom: '1px solid #222' },
    tdEmpty: { textAlign: 'center', padding: '20px', color: '#555' },
    info: { color: '#0f0', padding: '20px' }
};

export default EBM;