import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const EBM = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sdaFiltro, setSdaFiltro] = useState('');

    const unidadUsuario = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';

    const fetchTotales = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/ebm/totales-vuelo', {
                params: { unidad: unidadUsuario },
                headers: { Authorization: `Bearer ${token}` }
            });
            setDatos(res.data);
            
            // Auto-seleccionar primer SdA disponible
            if (res.data.length > 0 && !sdaFiltro) {
                const primerSda = res.data[0].habilitaciones[0]?.aeronave;
                if (primerSda) setSdaFiltro(primerSda);
            }
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    }, [unidadUsuario, sdaFiltro]);

    useEffect(() => { fetchTotales(); }, [fetchTotales]);

    const filtrados = datos.filter(p => 
        p.habilitaciones.some(h => h.aeronave === sdaFiltro)
    );

    if (loading) return <div style={{color: '#0f0', padding: '20px'}}>CARGANDO TOTALES REALES...</div>;

    return (
        <div style={{ padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
            <h2>TOTALES DE VUELO TRIMESTRALES 2026</h2>
            <div style={{ marginBottom: '20px' }}>
                <label>SISTEMA: </label>
                <select value={sdaFiltro} onChange={e => setSdaFiltro(e.target.value)} style={{padding: '5px'}}>
                    {Array.from(new Set(datos.flatMap(p => p.habilitaciones.map(h => h.aeronave)))).map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e1e1e' }}>
                <thead>
                    <tr style={{ backgroundColor: '#252525' }}>
                        <th style={styles.th}>OFICIAL</th>
                        <th style={styles.th}>1er TRIM</th>
                        <th style={styles.th}>2do TRIM</th>
                        <th style={styles.th}>3er TRIM</th>
                        <th style={styles.th}>4to TRIM</th>
                        <th style={styles.th}>TOTAL ANUAL</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.map(p => {
                        const anual = p.horasTrimestres.reduce((a, b) => a + b, 0);
                        return (
                            <tr key={p._id} style={{ borderBottom: '1px solid #333' }}>
                                <td style={styles.td}><b>{p.grado}</b> {p.apellido}</td>
                                <td style={styles.tdCenter}>{p.horasTrimestres[0]} hs</td>
                                <td style={styles.tdCenter}>{p.horasTrimestres[1]} hs</td>
                                <td style={styles.tdCenter}>{p.horasTrimestres[2]} hs</td>
                                <td style={styles.tdCenter}>{p.horasTrimestres[3]} hs</td>
                                <td style={{...styles.tdCenter, color: '#0f0'}}>{anual} hs</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const styles = {
    th: { padding: '12px', border: '1px solid #333', textAlign: 'left' },
    td: { padding: '12px', border: '1px solid #333' },
    tdCenter: { padding: '12px', border: '1px solid #333', textAlign: 'center' }
};

export default EBM;