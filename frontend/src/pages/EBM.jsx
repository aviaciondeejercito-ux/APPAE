import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const EBM = () => {
    const [oficiales, setOficiales] = useState([]);
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);

    const unidad = localStorage.getItem('unidad');
    const role = localStorage.getItem('role');
    const anioActual = new Date().getFullYear();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [resOficiales, resPlanes] = await Promise.all([
                axios.get(`/api/ebm/oficiales?unidad=${unidad}&role=${role}`),
                axios.get(`/api/ebm/plan?unidad=${unidad}&anio=${anioActual}`)
            ]);
            
            setOficiales(resOficiales.data);
            setPlanes(resPlanes.data);
        } catch (error) {
            console.error("Error táctico en carga de datos:", error);
        } finally {
            setLoading(false);
        }
    }, [unidad, role, anioActual]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePlanChange = async (pilotoId, trimIndex, campo, valor) => {
        const planExistente = planes.find(p => p.piloto._id === pilotoId) || {
            pilotoId,
            año: anioActual,
            unidad,
            trimestres: [
                { numero: 1, rol: 'Copiloto', tipo: 'A', causaNoCumplimiento: '' },
                { numero: 2, rol: 'Copiloto', tipo: 'A', causaNoCumplimiento: '' },
                { numero: 3, rol: 'Copiloto', tipo: 'A', causaNoCumplimiento: '' },
                { numero: 4, rol: 'Copiloto', tipo: 'A', causaNoCumplimiento: '' }
            ]
        };

        const nuevosTrimestres = [...planExistente.trimestres];
        nuevosTrimestres[trimIndex] = { 
            ...nuevosTrimestres[trimIndex], 
            [campo]: valor 
        };

        try {
            const res = await axios.post('/api/ebm/save', {
                pilotoId,
                año: anioActual,
                unidad,
                trimestres: nuevosTrimestres
            });
            
            setPlanes(prev => {
                const index = prev.findIndex(p => p.piloto._id === pilotoId);
                if (index !== -1) {
                    const newPlanes = [...prev];
                    newPlanes[index] = { ...newPlanes[index], trimestres: nuevosTrimestres };
                    return newPlanes;
                }
                return [...prev, res.data.plan];
            });
        } catch (error) {
            console.error("Fallo al sincronizar plan:", error);
        }
    };

    if (loading) return <div style={{padding: '20px', color: '#fff'}}>Iniciando Protocolo EBM...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.titulo}>PLANIFICACIÓN EBM {anioActual}</h1>
                <p style={styles.subtitulo}>Unidad: {unidad} | Gestión de Oficiales (CR a ST)</p>
            </header>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th rowSpan="2" style={styles.thMain}>GRADO Y APELLIDO</th>
                            {[1, 2, 3, 4].map(t => (
                                <th key={t} colSpan="3" style={styles.thTrim}>{t}er TRIMESTRE</th>
                            ))}
                        </tr>
                        <tr>
                            {[1, 2, 3, 4].map(t => (
                                <React.Fragment key={t}>
                                    <th style={styles.thSub}>ROL</th>
                                    <th style={styles.thSub}>TIPO</th>
                                    <th style={styles.thSub}>CAUSA NO CUMP.</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {oficiales.map(of => {
                            const planOf = planes.find(p => p.piloto._id === of._id);
                            return (
                                <tr key={of._id} style={styles.row}>
                                    <td style={styles.tdNombre}>{`${of.grado} ${of.apellido}`}</td>
                                    {[0, 1, 2, 3].map(idx => (
                                        <React.Fragment key={idx}>
                                            <td style={styles.tdSelect}>
                                                <select 
                                                    value={planOf?.trimestres[idx]?.rol || 'Copiloto'}
                                                    onChange={(e) => handlePlanChange(of._id, idx, 'rol', e.target.value)}
                                                    style={styles.select}
                                                >
                                                    <option value="Copiloto">Copiloto</option>
                                                    <option value="Piloto">Piloto</option>
                                                    <option value="Instructor">Instructor</option>
                                                </select>
                                            </td>
                                            <td style={styles.tdSelect}>
                                                <select 
                                                    value={planOf?.trimestres[idx]?.tipo || 'A'}
                                                    onChange={(e) => handlePlanChange(of._id, idx, 'tipo', e.target.value)}
                                                    style={styles.selectTipo}
                                                >
                                                    {['A', 'B', 'C', 'D'].map(l => (
                                                        <option key={l} value={l}>{l}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={styles.tdCausa}>
                                                <input 
                                                    type="text"
                                                    placeholder="OBS..."
                                                    defaultValue={planOf?.trimestres[idx]?.causaNoCumplimiento || ''}
                                                    onBlur={(e) => handlePlanChange(of._id, idx, 'causaNoCumplimiento', e.target.value)}
                                                    style={styles.inputCausa}
                                                />
                                            </td>
                                        </React.Fragment>
                                    ))}
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
    container: { padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#e0e0e0' },
    header: { marginBottom: '25px', borderBottom: '2px solid #333', paddingBottom: '10px' },
    titulo: { fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0 },
    subtitulo: { fontSize: '13px', color: '#888' },
    tableWrapper: { overflowX: 'auto', backgroundColor: '#252525', borderRadius: '8px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    thMain: { padding: '12px', border: '1px solid #444', backgroundColor: '#333', color: '#fff' },
    thTrim: { padding: '8px', border: '1px solid #444', backgroundColor: '#2c3e50', textAlign: 'center', color: '#fff' },
    thSub: { padding: '6px', border: '1px solid #444', backgroundColor: '#333', color: '#bbb' },
    tdNombre: { padding: '10px', border: '1px solid #444', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap' },
    tdSelect: { padding: '4px', border: '1px solid #444', textAlign: 'center' },
    tdCausa: { padding: '4px', border: '1px solid #444' },
    select: { backgroundColor: '#444', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', width: '90px', fontSize: '11px' },
    selectTipo: { backgroundColor: '#2c3e50', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' },
    inputCausa: { backgroundColor: '#111', color: '#00ff00', border: '1px solid #444', borderRadius: '4px', padding: '4px', width: '100px', fontSize: '10px', textAlign: 'center' },
    row: { borderBottom: '1px solid #333' }
};

export default EBM;