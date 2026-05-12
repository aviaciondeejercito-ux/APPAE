import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const EBM = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    // Estado para que los mandos puedan cambiar de unidad en la vista
    const [unidadFiltro, setUnidadFiltro] = useState(localStorage.getItem('unidad') || '');

    const role = localStorage.getItem('role')?.toUpperCase();
    const anioActual = new Date().getFullYear();

    // Permisos
    const esMando = ['ADMIN', 'DIRECTOR', 'BOSS'].includes(role);
    const unidadesDisponibles = ['CA AE 601', 'CA AE 602', 'SEC AV EJ', 'ESCUELA']; // Ajustar según corresponda

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // Usamos el endpoint optimizado que unifica Oficiales + Planes
            const response = await axios.get(`/api/ebm/planificacion-completa`, {
                params: {
                    unidad: unidadFiltro,
                    anio: anioActual,
                    role: role
                }
            });
            setDatos(response.data);
        } catch (error) {
            console.error("Error táctico en carga de datos:", error);
        } finally {
            setLoading(false);
        }
    }, [unidadFiltro, role, anioActual]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePlanChange = async (pilotoId, trimIndex, campo, valor) => {
        // Si no es mando, no puede editar
        if (!esMando) return;

        const oficialActual = datos.find(d => d._id === pilotoId);
        if (!oficialActual) return;

        // Clonar trimestres y actualizar el campo específico
        const nuevosTrimestres = [...oficialActual.plan.trimestres];
        nuevosTrimestres[trimIndex] = { 
            ...nuevosTrimestres[trimIndex], 
            [campo]: valor 
        };

        try {
            await axios.post('/api/ebm/save', {
                pilotoId,
                año: anioActual,
                unidad: oficialActual.unidad,
                trimestres: nuevosTrimestres
            });
            
            // Actualización optimista del estado local
            setDatos(prev => prev.map(d => 
                d._id === pilotoId 
                    ? { ...d, plan: { ...d.plan, trimestres: nuevosTrimestres } } 
                    : d
            ));
        } catch (error) {
            console.error("Fallo al sincronizar plan:", error);
            alert("Error al guardar los cambios.");
        }
    };

    if (loading) return <div style={styles.loading}>Iniciando Protocolo EBM...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.titulo}>PLANIFICACIÓN EBM {anioActual}</h1>
                    {esMando && (
                        <div style={styles.filtroContainer}>
                            <label style={styles.label}>UNIDAD:</label>
                            <select 
                                value={unidadFiltro} 
                                onChange={(e) => setUnidadFiltro(e.target.value)}
                                style={styles.selectUnidad}
                            >
                                {unidadesDisponibles.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <p style={styles.subtitulo}>
                    {esMando ? "MODO EDICIÓN COMANDO" : "MODO CONSULTA"} | Jerarquías: CR a ST
                </p>
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
                                    <th style={styles.thSub}>OBSERVACIONES</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {datos.map(item => (
                            <tr key={item._id} style={styles.row}>
                                <td style={styles.tdNombre}>
                                    <span style={styles.grado}>{item.grado}</span> {item.apellido}
                                </td>
                                {[0, 1, 2, 3].map(idx => (
                                    <React.Fragment key={idx}>
                                        <td style={styles.tdCell}>
                                            <select 
                                                disabled={!esMando}
                                                value={item.plan.trimestres[idx]?.rol || ''}
                                                onChange={(e) => handlePlanChange(item._id, idx, 'rol', e.target.value)}
                                                style={esMando ? styles.select : styles.readOnlyText}
                                            >
                                                <option value="">-</option>
                                                <option value="Copiloto">Copiloto</option>
                                                <option value="Piloto">Piloto</option>
                                                <option value="Instructor">Instructor</option>
                                            </select>
                                        </td>
                                        <td style={styles.tdCell}>
                                            <select 
                                                disabled={!esMando}
                                                value={item.plan.trimestres[idx]?.tipo || ''}
                                                onChange={(e) => handlePlanChange(item._id, idx, 'tipo', e.target.value)}
                                                style={esMando ? styles.selectTipo : styles.readOnlyText}
                                            >
                                                <option value="">-</option>
                                                {['A', 'B', 'C', 'D'].map(l => (
                                                    <option key={l} value={l}>{l}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={styles.tdCell}>
                                            <input 
                                                disabled={!esMando}
                                                type="text"
                                                placeholder="Causa..."
                                                defaultValue={item.plan.trimestres[idx]?.causaNoCumplimiento || ''}
                                                onBlur={(e) => handlePlanChange(item._id, idx, 'causaNoCumplimiento', e.target.value)}
                                                style={esMando ? styles.inputCausa : styles.readOnlyInput}
                                            />
                                        </td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'sans-serif' },
    loading: { padding: '40px', color: '#00ff00', fontSize: '18px', textAlign: 'center', backgroundColor: '#121212', height: '100vh' },
    header: { marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    titulo: { fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: 0, letterSpacing: '1px' },
    subtitulo: { fontSize: '12px', color: '#aaa', margin: 0 },
    filtroContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
    label: { fontSize: '12px', fontWeight: 'bold', color: '#00ff00' },
    selectUnidad: { backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    tableWrapper: { overflowX: 'auto', backgroundColor: '#1e1e1e', borderRadius: '4px', border: '1px solid #333' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    thMain: { padding: '15px', border: '1px solid #333', backgroundColor: '#252525', color: '#fff' },
    thTrim: { padding: '10px', border: '1px solid #333', backgroundColor: '#1a2a3a', textAlign: 'center', color: '#fff', fontWeight: 'bold' },
    thSub: { padding: '8px', border: '1px solid #333', backgroundColor: '#252525', color: '#888' },
    row: { borderBottom: '1px solid #222' },
    tdNombre: { padding: '12px', border: '1px solid #333', color: '#fff', whiteSpace: 'nowrap', backgroundColor: '#1e1e1e' },
    grado: { color: '#00ff00', fontWeight: 'bold', marginRight: '5px' },
    tdCell: { padding: '2px', border: '1px solid #222', textAlign: 'center' },
    select: { backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '4px', borderRadius: '3px', width: '95%', cursor: 'pointer' },
    selectTipo: { backgroundColor: '#1a2a3a', color: '#00ff00', border: '1px solid #444', padding: '4px', borderRadius: '3px', fontWeight: 'bold', width: '95%', textAlign: 'center' },
    inputCausa: { backgroundColor: '#000', color: '#ccc', border: '1px solid #333', borderRadius: '3px', padding: '4px', width: '90%', fontSize: '10px' },
    readOnlyText: { backgroundColor: 'transparent', color: '#888', border: 'none', appearance: 'none', textAlign: 'center', width: '100%' },
    readOnlyInput: { backgroundColor: 'transparent', color: '#666', border: 'none', textAlign: 'center', width: '100%' }
};

export default EBM;