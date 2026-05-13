import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const EbmPage = () => {
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sdaFiltro, setSdaFiltro] = useState('');

    // --- DATOS DE SESIÓN ---
    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';
    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_-]/g, '');

    const fetchPersonal = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Usamos la ruta de tripulantes que ya sabemos que FUNCIONA
            const response = await axios.get('/api/tripulantes', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const miUnidadLogueada = userUnidad.trim().toUpperCase();
            const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);

            // 1. Filtro por Grados de Oficiales Pilotos (CR a ST)
            const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
            let dataFiltrada = response.data.filter(p => gradosHabilitados.includes(p.grado));

            // 2. Filtro por Jurisdicción (Unidad)
            if (!esMandoEstrategico) {
                dataFiltrada = dataFiltrada.filter(p => {
                    const unidadDelPiloto = (p.elemento || p.unidad || '').trim().toUpperCase();
                    return unidadDelPiloto === miUnidadLogueada;
                });
            }

            setPersonal(dataFiltrada || []);

            // Auto-selección de SdA para la tabla
            if (dataFiltrada.length > 0 && !sdaFiltro) {
                const primerSda = dataFiltrada[0].habilitaciones?.[0]?.aeronave;
                if (primerSda) setSdaFiltro(primerSda);
            }

        } catch (error) {
            console.error("❌ Error de carga de personal EBM:", error);
        } finally {
            setLoading(false);
        }
    }, [userUnidad, roleNormalizado, sdaFiltro]);

    useEffect(() => {
        fetchPersonal();
    }, [fetchPersonal]);

    // Filtro secundario por Sistema de Armas
    const listaFinal = sdaFiltro 
        ? personal.filter(p => p.habilitaciones?.some(h => h.aeronave === sdaFiltro))
        : personal;

    if (loading) return <div style={{ color: '#0f0', padding: '20px' }}>CARGANDO PERSONAL EBM...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2>NÓMINA EBM - {userUnidad}</h2>
                <div style={styles.filtros}>
                    <label>SISTEMA: </label>
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
                    {listaFinal.map(p => (
                        <tr key={p._id} style={styles.tr}>
                            <td style={styles.td}><b>{p.grado}</b></td>
                            <td style={styles.td}>{p.apellido}, {p.nombre}</td>
                            <td style={styles.td}>{p.elemento || p.unidad}</td>
                            <td style={styles.td}>
                                {p.habilitaciones?.map(h => h.aeronave).join(' / ') || '---'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' },
    header: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' },
    select: { backgroundColor: '#222', color: '#0f0', border: '1px solid #0f0', padding: '5px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', color: '#888', borderBottom: '2px solid #444' },
    td: { padding: '12px', borderBottom: '1px solid #222' },
};

export default EbmPage;