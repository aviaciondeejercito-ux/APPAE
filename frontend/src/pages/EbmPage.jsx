import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const EBM = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- NORMALIZACIÓN SINCRO JOKER ---
    // Extraemos la unidad/elemento y el rol detectando todas las posibles variantes de nombre
    const unidadUsuario = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';
    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'user';
    const role = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const anioActual = new Date().getFullYear();

    // Filtros de visualización
    const [unidadFiltro, setUnidadFiltro] = useState(unidadUsuario);
    const [sdaSeleccionado, setSdaSeleccionado] = useState('');

    // Definición de Permisos Operativos
    const esAdmin = role === 'ADMIN';
    const esMandoSuperior = ['BOSS', 'DIRECTOR', 'OTO'].includes(role);
    const esOperaciones = role === 'OPERACIONES';
    const puedeCambiarUnidad = esAdmin || esMandoSuperior;

    const unidadesDisponibles = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
        "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
        "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"
    ];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Llamada al endpoint de planificación
            const response = await axios.get(`/api/ebm/planificacion-completa`, {
                params: {
                    unidad: puedeCambiarUnidad ? unidadFiltro : unidadUsuario,
                    anio: anioActual,
                    rol: role 
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            // SINCRO JOKER: Si el piloto no tiene plan, el controlador ya envía uno vacío,
            // pero reforzamos aquí para evitar errores de renderizado.
            const datosNormalizados = response.data.map(p => ({
                ...p,
                plan: p.plan || { 
                    trimestres: [
                        { numero: 1, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 2, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 3, rol: '', tipo: '', causaNoCumplimiento: '' },
                        { numero: 4, rol: '', tipo: '', causaNoCumplimiento: '' }
                    ] 
                }
            }));

            setDatos(datosNormalizados);
            
            // Selección automática del primer Sistema de Armas disponible si no hay uno
            if (datosNormalizados.length > 0 && !sdaSeleccionado) {
                const todosSdas = new Set();
                datosNormalizados.forEach(p => p.habilitaciones?.forEach(h => todosSdas.add(h.aeronave)));
                const listaSdas = Array.from(todosSdas).sort();
                if (listaSdas.length > 0) setSdaSeleccionado(listaSdas[0]);
            }
        } catch (error) {
            console.error("❌ Error en carga de datos EBM:", error);
        } finally {
            setLoading(false);
        }
    }, [unidadFiltro, unidadUsuario, puedeCambiarUnidad, role, anioActual, sdaSeleccionado]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sdasEnUnidad = useMemo(() => {
        const sistemas = new Set();
        datos.forEach(p => {
            p.habilitaciones?.forEach(h => sistemas.add(h.aeronave));
        });
        return Array.from(sistemas).sort();
    }, [datos]);

    const pilotosFiltrados = useMemo(() => {
        if (!sdaSeleccionado) return [];
        return datos.filter(p => 
            p.habilitaciones?.some(h => h.aeronave === sdaSeleccionado)
        );
    }, [datos, sdaSeleccionado]);

    const puedeEditarFila = (unidadFila) => {
        if (esAdmin) return true;
        const uFila = String(unidadFila || '').toUpperCase().trim();
        const uUser = String(unidadUsuario || '').toUpperCase().trim();
        return esOperaciones && uFila === uUser;
    };

    const handlePlanChange = async (pilotoId, trimIndex, campo, valor) => {
        const oficialActual = datos.find(d => d._id === pilotoId);
        if (!oficialActual || !puedeEditarFila(oficialActual.unidad)) return;

        // Clonamos la estructura para no mutar el estado directamente
        const nuevosTrimestres = [...oficialActual.plan.trimestres];
        nuevosTrimestres[trimIndex] = { ...nuevosTrimestres[trimIndex], [campo]: valor, numero: trimIndex + 1 };

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/ebm/save', {
                pilotoId,
                año: anioActual,
                unidad: oficialActual.unidad,
                trimestres: nuevosTrimestres
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Actualización optimista de la UI
            setDatos(prev => prev.map(d =>
                d._id === pilotoId ? { ...d, plan: { ...d.plan, trimestres: nuevosTrimestres } } : d
            ));
        } catch (error) {
            console.error("❌ Fallo al guardar planificación:", error);
        }
    };

    if (loading) return <div style={styles.loading}>Procesando Legajos y Exigencias EBM...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.titulo}>PLANIFICACIÓN EBM {anioActual}</h1>
                    <div style={styles.filtrosBox}>
                        {puedeCambiarUnidad && (
                            <div style={styles.filtroGroup}>
                                <label style={styles.label}>UNIDAD / ELEMENTO:</label>
                                <select value={unidadFiltro} onChange={(e) => setUnidadFiltro(e.target.value)} style={styles.select}>
                                    {unidadesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={styles.filtroGroup}>
                            <label style={styles.label}>SISTEMA DE ARMAS:</label>
                            <select value={sdaSeleccionado} onChange={(e) => setSdaSeleccionado(e.target.value)} style={styles.selectSda}>
                                {sdasEnUnidad.length === 0 && <option>No hay personal habilitado</option>}
                                {sdasEnUnidad.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div style={styles.infoBar}>
                    Sistema Activo: <span style={styles.highlight}>{sdaSeleccionado || '---'}</span> | 
                    Efectivos en Pantalla: {pilotosFiltrados.length}
                </div>
            </header>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th rowSpan="2" style={styles.thMain}>GRADO Y APELLIDO</th>
                            <th rowSpan="2" style={styles.thMain}>HS TOTALES ({sdaSeleccionado})</th>
                            {[1, 2, 3, 4].map(t => (
                                <th key={t} colSpan="3" style={styles.thTrim}>{t}er TRIMESTRE</th>
                            ))}
                        </tr>
                        <tr>
                            {[1, 2, 3, 4].map(t => (
                                <React.Fragment key={t}>
                                    <th style={styles.thSub}>ROL</th>
                                    <th style={styles.thSub}>TIPO</th>
                                    <th style={styles.thSub}>CAUSA</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pilotosFiltrados.map(item => {
                            const habilitacion = item.habilitaciones.find(h => h.aeronave === sdaSeleccionado);
                            const editable = puedeEditarFila(item.unidad);
                            return (
                                <tr key={item._id} style={styles.row}>
                                    <td style={styles.tdNombre}>
                                        <span style={styles.grado}>{item.grado}</span> {item.apellido}
                                    </td>
                                    <td style={styles.tdHoras}>
                                        {habilitacion?.totalHorasSistema || 0} hs
                                    </td>
                                    {[0, 1, 2, 3].map(idx => (
                                        <React.Fragment key={idx}>
                                            <td style={styles.tdCell}>
                                                <select 
                                                    disabled={!editable}
                                                    value={item.plan?.trimestres?.[idx]?.rol || ''}
                                                    onChange={(e) => handlePlanChange(item._id, idx, 'rol', e.target.value)}
                                                    style={editable ? styles.selectCell : styles.readOnly}
                                                >
                                                    <option value="">-</option>
                                                    <option value="Copiloto">Copiloto</option>
                                                    <option value="Piloto">Piloto</option>
                                                    <option value="Instructor">Instructor</option>
                                                </select>
                                            </td>
                                            <td style={styles.tdCell}>
                                                <select 
                                                    disabled={!editable}
                                                    value={item.plan?.trimestres?.[idx]?.tipo || ''}
                                                    onChange={(e) => handlePlanChange(item._id, idx, 'tipo', e.target.value)}
                                                    style={editable ? styles.selectTipo : styles.readOnly}
                                                >
                                                    <option value="">-</option>
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                    <option value="D">D</option>
                                                </select>
                                            </td>
                                            <td style={styles.tdCell}>
                                                <input 
                                                    disabled={!editable}
                                                    type="text"
                                                    defaultValue={item.plan?.trimestres?.[idx]?.causaNoCumplimiento || ''}
                                                    onBlur={(e) => handlePlanChange(item._id, idx, 'causaNoCumplimiento', e.target.value)}
                                                    style={editable ? styles.inputCausa : styles.readOnlyInput}
                                                    placeholder="..."
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
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'sans-serif' },
    loading: { padding: '40px', color: '#00ff00', textAlign: 'center', height: '100vh' },
    header: { marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    titulo: { fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0 },
    filtrosBox: { display: 'flex', gap: '20px' },
    filtroGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '10px', color: '#00ff00', fontWeight: 'bold' },
    infoBar: { marginTop: '10px', fontSize: '12px', color: '#888' },
    highlight: { color: '#00ff00', fontWeight: 'bold' },
    select: { backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '4px', borderRadius: '4px' },
    selectSda: { backgroundColor: '#1a2a3a', color: '#00ff00', border: '1px solid #00ff00', padding: '4px', borderRadius: '4px', fontWeight: 'bold' },
    tableWrapper: { overflowX: 'auto', backgroundColor: '#1e1e1e', borderRadius: '4px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    thMain: { padding: '12px', border: '1px solid #333', backgroundColor: '#252525' },
    thTrim: { padding: '8px', border: '1px solid #333', backgroundColor: '#1a2a3a', textAlign: 'center' },
    thSub: { padding: '6px', border: '1px solid #333', backgroundColor: '#252525', color: '#777' },
    tdNombre: { padding: '10px', border: '1px solid #333', whiteSpace: 'nowrap' },
    tdHoras: { textAlign: 'center', border: '1px solid #333', color: '#aaa' },
    grado: { color: '#00ff00', fontWeight: 'bold' },
    tdCell: { padding: '2px', border: '1px solid #222' },
    selectCell: { backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', width: '95%', padding: '2px' },
    selectTipo: { backgroundColor: '#1a2a3a', color: '#00ff00', border: '1px solid #444', width: '95%', fontWeight: 'bold', padding: '2px' },
    inputCausa: { backgroundColor: '#000', color: '#ccc', border: '1px solid #333', width: '90%', padding: '2px' },
    readOnly: { backgroundColor: 'transparent', color: '#555', border: 'none', textAlign: 'center', width: '100%', appearance: 'none' },
    readOnlyInput: { backgroundColor: 'transparent', color: '#444', border: 'none', textAlign: 'center', width: '100%' }
};

export default EBM;