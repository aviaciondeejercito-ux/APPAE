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
            // Asignamos un peso numérico donde el menor número es la máxima prioridad (Descendente)
            const ordenGrados = {
                'CR': 1,
                'TC': 2,
                'MY': 3,
                'CT': 4,
                'TP': 5,
                'TT': 6,
                'ST': 7
            };

            const datosOrdenados = dataBackend.sort((a, b) => {
                const pesoA = ordenGrados[a.grado] || 99; // 99 por si viene un grado no contemplado
                const pesoB = ordenGrados[b.grado] || 99;

                // 1. Si los grados son distintos, ordena por la jerarquía militar
                if (pesoA !== pesoB) {
                    return pesoA - pesoB;
                }

                // 2. Si tienen el mismo grado, desempata alfabéticamente por Apellido
                const apellidoA = (a.apellido || '').trim().toUpperCase();
                const apellidoB = (b.apellido || '').trim().toUpperCase();
                
                if (apellidoA !== apellidoB) {
                    return apellidoA.localeCompare(apellidoB);
                }

                // 3. Si tienen el mismo apellido, desempata por Nombre
                const nombreA = (a.nombre || '').trim().toUpperCase();
                const nombreB = (b.nombre || '').trim().toUpperCase();
                return nombreA.localeCompare(nombreB);
            });

            // Seteamos la lista con la estructura de comando correcta
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
                        <th style={styles.thLineal}>HORAS ACUMULADAS ANUALES</th>
                    </tr>
                </thead>
                <tbody>
                    {listaFinal.length > 0 ? (
                        listaFinal.map(p => (
                            <tr key={p._id} style={styles.tr}>
                                <td style={styles.td}><span style={{ color: '#0f0', fontFamily: 'monospace' }}>{p.grado}</span></td>
                                <td style={styles.td}><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{p.apellido}, {p.nombre}</span></td>
                                <td style={styles.td}>{p.elemento || p.unidad}</td>
                                <td style={styles.tdHoras}>
                                    {p.horasAcumuladas !== undefined ? `${p.horasAcumuladas} HS` : '0 HS'}
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
    thLineal: { textAlign: 'right', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', paddingRight: '30px' },
    td: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px' },
    tdHoras: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px', textAlign: 'right', color: '#0f0', fontFamily: 'monospace', fontWeight: 'bold', paddingRight: '30px' },
    tr: { transition: 'background-color 0.2s', ':hover': { backgroundColor: '#1a1a1a' } }
};

export default EbmPage;