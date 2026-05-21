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
            const dataBackend = response.data || [];

            // --- ESQUEMA DE ORDENAMIENTO MILITAR JERÁRQUICO ---
            const ordenGrados = {
                'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7
            };

            const datosOrdenados = dataBackend.sort((a, b) => {
                const pesoA = ordenGrados[a.grado] || 99;
                const pesoB = ordenGrados[b.grado] || 99;

                if (pesoA !== pesoB) return pesoA - pesoB;

                const apellidoA = (a.apellido || '').trim().toUpperCase();
                const apellidoB = (b.apellido || '').trim().toUpperCase();
                if (apellidoA !== apellidoB) return apellidoA.localeCompare(apellidoB);

                const nombreA = (a.nombre || '').trim().toUpperCase();
                const nombreB = (b.nombre || '').trim().toUpperCase();
                return nombreA.localeCompare(nombreB);
            });

            setPersonal(datosOrdenados);

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

    if (loading) return <div style={{ color: '#0f0', padding: '20px', fontFamily: 'monospace' }}>CARGANDO PANEL OPERATIVO EBM...</div>;

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
                        <th style={styles.thTrimestre}>1° TRIM</th>
                        <th style={styles.thTrimestre}>2° TRIM</th>
                        <th style={styles.thTrimestre}>3° TRIM</th>
                        <th style={styles.thTrimestre}>4° TRIM</th>
                        <th style={styles.thTotal}>TOTAL ANUAL</th>
                    </tr>
                </thead>
                <tbody>
                    {listaFinal.length > 0 ? (
                        listaFinal.map(p => (
                            <tr key={p._id} style={styles.tr}>
                                <td style={styles.tdGrado}><span style={{ color: '#0f0', fontFamily: 'monospace' }}>{p.grado}</span></td>
                                <td style={styles.tdNombre}><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{p.apellido}, {p.nombre}</span></td>
                                
                                {/* Desglose Trimestral */}
                                <td style={styles.tdMétrica}>{p.horasTrimestrales?.t1 || 0} hs</td>
                                <td style={styles.tdMétrica}>{p.horasTrimestrales?.t2 || 0} hs</td>
                                <td style={styles.tdMétrica}>{p.horasTrimestrales?.t3 || 0} hs</td>
                                <td style={styles.tdMétrica}>{p.horasTrimestrales?.t4 || 0} hs</td>
                                
                                {/* Acumulado Total */}
                                <td style={styles.tdTotal}>
                                    {p.horasAcumuladas !== undefined ? `${p.horasAcumuladas} HS` : '0 HS'}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666', fontFamily: 'monospace' }}>
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
    
    // Encabezados
    th: { textAlign: 'left', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
    thTrimestre: { textAlign: 'right', padding: '12px', color: '#666', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '10%' },
    thTotal: { textAlign: 'right', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', paddingRight: '20px', width: '15%' },
    
    // Celdas
    tdGrado: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px', width: '8%' },
    tdNombre: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px' },
    tdMétrica: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px', textAlign: 'right', fontFamily: 'monospace', color: '#aaa' },
    tdTotal: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px', textAlign: 'right', color: '#0f0', fontFamily: 'monospace', fontWeight: 'bold', paddingRight: '20px' },
    
    tr: { transition: 'background-color 0.2s', ':hover': { backgroundColor: '#1a1a1a' } }
};

export default EbmPage;