import React, { useState, useEffect, useCallback } from 'react';
// Importamos la función declarada y tipada en tu archivo api.js centralizado
import { getPlanificacionEbm } from '../services/api'; 

const EbmPage = () => {
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sdaFiltro, setSdaFiltro] = useState('');

    // --- DATOS DE SESIÓN ---
    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || 'MI UNIDAD';

    const fetchPersonal = useCallback(async () => {
        try {
            setLoading(true);
            
            // Consumimos el endpoint centralizado con la URL correcta de Render y tokens inyectados
            const response = await getPlanificacionEbm();

            // Seteamos directamente la lista atómica enviada por el backend
            const dataBackend = response.data || [];
            setPersonal(dataBackend);

        } catch (error) {
            console.error("❌ Error de carga de personal EBM:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPersonal();
    }, [fetchPersonal]);

    // Filtro dinámico en cascada por Sistema de Armas sobre el personal recuperado
    const listaFinal = sdaFiltro 
        ? personal.filter(p => p.habilitaciones?.some(h => h.aeronave === sdaFiltro))
        : personal;

    if (loading) return <div style={{ color: '#0f0', padding: '20px', fontFamily: 'monospace' }}>CARGANDO PERSONAL EBM...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={{ margin: 0, textTransform: 'uppercase' }}>NÓMINA EBM - {userUnidad}</h2>
                <div style={styles.filtros}>
                    <label style={{ fontFamily: 'monospace', fontSize: '14px' }}>SISTEMA: </label>
                    <select value={sdaFiltro} onChange={(e) => setSdaFiltro(e.target.value)} style={styles.select}>
                        <option value="">TODOS</option>
                        {Array.from(new Set(personal.flatMap(p => p.habilitaciones?.map(h => h.aeronave) || []))).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </header>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>GRADO</th>
                        <th style={styles.th}>APELLIDO Y NOMBRE</th>
                        <th style={styles.th}>UNIDAD</th>
                        <th style={styles.th}>HABILITACIONES</th>
                    </tr>
                </thead>
                <tbody>
                    {listaFinal.length > 0 ? (
                        listaFinal.map(p => (
                            <tr key={p._id} style={styles.tr}>
                                <td style={styles.td}><span style={{ color: '#0f0', fontFamily: 'monospace' }}>{p.grado}</span></td>
                                <td style={styles.td}><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{p.apellido}, {p.nombre}</span></td>
                                <td style={styles.td}>{p.elemento || p.unidad}</td>
                                <td style={styles.td}>
                                    {p.habilitaciones?.map(h => h.aeronave).join(' / ') || '---'}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666', fontFamily: 'monospace' }}>
                                NO SE ENCONTRARON PILOTOS REGISTRADOS PARA ESTA JURISDICCIÓN
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' },
    filtros: { display: 'flex', alignItems: 'center', gap: '10px' },
    select: { backgroundColor: '#222', color: '#0f0', border: '1px solid #0f0', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
    td: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px' },
    tr: { transition: 'background-color 0.2s', ':hover': { backgroundColor: '#1a1a1a' } }
};

export default EbmPage;