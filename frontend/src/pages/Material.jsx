import React, { useEffect, useState } from 'react';
import { getAircrafts, updateAircraftStatus, createAircraft, deleteAircraft } from '../services/api';

const Material = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null); 
    const [isEditing, setIsEditing] = useState(false); 
    
    // NORMALIZACIÓN DE SESIÓN (SINCRO JOKER)
    const rawRole = localStorage.getItem('role') || "";
    // Limpieza: Mayúsculas y sin espacios/guiones para evitar conflictos
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, ''); 
    
    const userElemento = localStorage.getItem('elemento')?.toUpperCase().trim() || "";
    const userName = localStorage.getItem('username') || 'Usuario';

    // Definición de permisos jerárquicos estrictos
    const isAdmin = roleNormalizado === 'ADMIN';
    const isMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);
    
    // Privilegios de edición: Mandos, Oficina Técnica y S4 Unidad
    const hasEditPrivileges = isMando || roleNormalizado === 'OFICINATECNICA' || roleNormalizado === 'S4UNIDAD';

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
        "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
        "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"
    ];

    const initialFormState = {
        matricula: '',
        sda: '',
        horasRemanentes: 0,
        novedades: '',
        unidadDestino: '',
        horasPlaneador: 0,
        motores: [{ horas: 0, fecha: '' }],
        helices: [{ horas: 0, fecha: '' }],
        vencimientoSeguro: '',
        vencimientoAvionica: '',
        vencimientoRAAC91207: '', // Campo corregido 07
        vencimientoRAAC91411: '',
        vencimientoRAAC91413: ''
    };

    const [newAir, setNewAir] = useState(initialFormState);

    useEffect(() => {
        if (roleNormalizado) {
            fetchMaterial();
        }
    }, [roleNormalizado, userElemento]);

    const fetchMaterial = async () => {
        try {
            setLoading(true);
            const { data } = await getAircrafts();
            const filtrados = isMando 
                ? data 
                : data.filter(a => 
                    a.unidad && 
                    userElemento && 
                    String(a.unidad).toUpperCase().trim() === userElemento
                );
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo de sincronización de material");
            setLoading(false);
        }
    };

    const handleEditClick = (air) => {
        setIsEditing(true);
        setNewAir({
            ...air,
            unidadDestino: air.unidad,
            motores: air.motores?.length ? air.motores : [{ horas: 0, fecha: '' }],
            helices: air.helices?.length ? air.helices : [{ horas: 0, fecha: '' }]
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setNewAir(initialFormState);
    };

    const addMotor = () => setNewAir({ ...newAir, motores: [...newAir.motores, { horas: 0, fecha: '' }] });
    const updateMotor = (index, field, value) => {
        const updated = [...newAir.motores];
        updated[index][field] = value;
        setNewAir({ ...newAir, motores: updated });
    };

    const addHelice = () => setNewAir({ ...newAir, helices: [...newAir.helices, { horas: 0, fecha: '' }] });
    const updateHelice = (index, field, value) => {
        const updated = [...newAir.helices];
        updated[index][field] = value;
        setNewAir({ ...newAir, helices: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newAir.matricula || !newAir.sda) return alert("Faltan campos obligatorios");
        
        const unidadFinal = isAdmin || isMando ? newAir.unidadDestino : userElemento;
        if (!unidadFinal) return alert("Debe seleccionar una unidad de destino.");

        const timestamp = `[Modificado: ${new Date().toLocaleDateString()} por ${userName}]`;

        try {
            const payload = {
                ...newAir,
                matricula: newAir.matricula.toUpperCase().trim(),
                horasRemanentes: Number(newAir.horasRemanentes) || 0,
                horasPlaneador: Number(newAir.horasPlaneador) || 0,
                unidad: unidadFinal,
                novedades: isEditing 
                    ? (newAir.novedades.includes(timestamp) ? newAir.novedades : `${newAir.novedades}\n${timestamp}`)
                    : (newAir.novedades ? `[${new Date().toLocaleDateString()}] ${userName}: ${newAir.novedades}` : '')
            };

            if (isEditing) {
                await updateAircraftStatus(newAir._id, payload);
                alert("Aeronave actualizada correctamente.");
            } else {
                payload.estado = 'E/S';
                payload.creadoPor = `${userName} (${rawRole})`;
                await createAircraft(payload);
                alert(`Aeronave registrada correctamente.`);
            }

            cancelEdit();
            await fetchMaterial();
        } catch (error) {
            alert("Error: Verifique permisos o conexión.");
        }
    };

    const handleUpdateField = async (id, updatedFields) => {
        try {
            const targetAir = aircrafts.find(a => a._id === id);
            if (!targetAir) return;
            await updateAircraftStatus(id, { ...targetAir, ...updatedFields });
            setAircrafts(prev => prev.map(a => a._id === id ? { ...a, ...updatedFields } : a));
        } catch (error) {
            alert("Error al actualizar.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Confirmar eliminación?")) return;
        try {
            await deleteAircraft(id);
            setAircrafts(prev => prev.filter(a => a._id !== id));
        } catch (error) {
            alert("Error al eliminar.");
        }
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
    };

    if (loading) return <div style={styles.loader}>Sincronizando material aéreo...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                {hasEditPrivileges ? (
                    <div style={styles.card}>
                        <h3 style={styles.title}>{isEditing ? "🔄 Actualizar Aeronave" : "➕ Alta de Aeronave"}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            
                            {(isMando || isEditing) && (
                                <div style={styles.field}>
                                    <label style={{...styles.label, color: '#e67e22'}}>📍 Unidad</label>
                                    <select 
                                        value={newAir.unidadDestino} 
                                        onChange={e => setNewAir({...newAir, unidadDestino: e.target.value})} 
                                        style={{...styles.input, border: '1px solid #e67e22'}} 
                                        required
                                        disabled={isEditing && !isMando}
                                    >
                                        <option value="">Seleccione Unidad...</option>
                                        {unidadesAE.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            )}

                            <div style={styles.field}>
                                <label style={styles.label}>Matrícula</label>
                                <input type="text" value={newAir.matricula} onChange={e => setNewAir({...newAir, matricula: e.target.value})} style={styles.input} required disabled={isEditing} />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Sistema de Armas</label>
                                <select value={newAir.sda} onChange={e => setNewAir({...newAir, sda: e.target.value})} style={styles.input} required>
                                    <option value="">Seleccione SdA...</option>
                                    {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Horas Remanentes</label>
                                <input type="number" value={newAir.horasRemanentes} onChange={e => setNewAir({...newAir, horasRemanentes: e.target.value})} style={styles.input} />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Vto RAAC 91.207 (ELT)</label>
                                <input type="date" value={formatDateForInput(newAir.vencimientoRAAC91207)} onChange={e => setNewAir({...newAir, vencimientoRAAC91207: e.target.value})} style={{...styles.input, backgroundColor: '#fff9db'}} />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Motores (Hs + Fecha)</label>
                                {newAir.motores.map((m, idx) => (
                                    <div key={idx} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                                        <input type="number" placeholder="Hs" value={m.horas} onChange={e => updateMotor(idx, 'horas', e.target.value)} style={{...styles.input, flex: 1}} />
                                        <input type="date" value={formatDateForInput(m.fecha)} onChange={e => updateMotor(idx, 'fecha', e.target.value)} style={{...styles.input, flex: 1}} />
                                        {idx === newAir.motores.length - 1 && <button type="button" onClick={addMotor} style={styles.btnAddSmall}>+</button>}
                                    </div>
                                ))}
                            </div>

                            <div style={styles.field}><label style={styles.label}>Vto Seguro</label><input type="date" value={formatDateForInput(newAir.vencimientoSeguro)} onChange={e => setNewAir({...newAir, vencimientoSeguro: e.target.value})} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Vto Aviónica</label><input type="date" value={formatDateForInput(newAir.vencimientoAvionica)} onChange={e => setNewAir({...newAir, vencimientoAvionica: e.target.value})} style={styles.input} /></div>

                            <div style={styles.field}>
                                <label style={styles.label}>Novedades</label>
                                <textarea value={newAir.novedades} onChange={e => setNewAir({...newAir, novedades: e.target.value})} style={{...styles.input, height: '60px', resize: 'none'}} />
                            </div>

                            <div style={{display: 'flex', gap: '10px'}}>
                                <button type="submit" style={{...styles.btnPrimary, flex: 2}}>
                                    {isEditing ? "Guardar Cambios" : "Registrar"}
                                </button>
                                {isEditing && <button type="button" onClick={cancelEdit} style={styles.btnCancel}>Anular</button>}
                            </div>
                        </form>
                    </div>
                ) : (
                    <div style={styles.card}>
                        <h3 style={styles.title}>📋 Vista de Unidad</h3>
                        <p>Elemento: <strong>{userElemento}</strong></p>
                    </div>
                )}

                <div style={styles.card}>
                    <h3 style={styles.title}>🛠️ Registro de Flota</h3>
                    <div style={styles.scrollList}>
                        {aircrafts.map(air => (
                            <div key={air._id} style={{...styles.item, borderLeft: air.estado === 'E/S' ? '6px solid #28a745' : '6px solid #e74c3c'}}>
                                <div style={{flex: 1.2}}>
                                    <div style={styles.itemMain}>{air.matricula}</div>
                                    <div style={styles.itemSub}>{air.sda} | {air.unidad}</div>
                                    <div style={{display:'flex', gap: '5px'}}>
                                        <button onClick={() => setSelectedNote(air)} style={styles.btnNoteTrigger}>📋 Ver Novedades</button>
                                        {hasEditPrivileges && <button onClick={() => handleEditClick(air)} style={{...styles.btnNoteTrigger, background: '#e3f2fd'}}>📝 Editar</button>}
                                    </div>
                                </div>
                                <div style={styles.actions}>
                                    <div style={styles.controlGroup}>
                                        <label style={styles.tinyLabel}>ESTADO</label>
                                        <select 
                                            value={air.estado || 'E/S'} 
                                            disabled={!hasEditPrivileges}
                                            onChange={(e) => handleUpdateField(air._id, { estado: e.target.value })} 
                                            style={styles.selectSmall}
                                        >
                                            <option value="E/S">E/S</option>
                                            <option value="F/S">F/S</option>
                                        </select>
                                    </div>
                                    {hasEditPrivileges && <button onClick={() => handleDelete(air._id)} style={styles.btnDelete}>🗑️</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {selectedNote && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h4 style={{marginTop: 0}}>Historial: {selectedNote.matricula}</h4>
                        <div style={styles.noteContent}>{selectedNote.novedades || "Sin novedades."}</div>
                        <button onClick={() => setSelectedNote(null)} style={{...styles.btnCancel, width: '100%', marginTop: '10px'}}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '25px', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '25px' },
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
    title: { marginTop: 0, fontSize: '1rem', color: '#1b3a57', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' },
    field: { display: 'flex', flexDirection: 'column', gap: '2px' },
    label: { fontSize: '0.65rem', fontWeight: 'bold', color: '#555' },
    input: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' },
    btnPrimary: { background: '#1b3a57', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnAddSmall: { background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '25px' },
    scrollList: { maxHeight: '500px', overflowY: 'auto' },
    item: { display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '10px' },
    itemMain: { fontWeight: 'bold', fontSize: '1rem' },
    itemSub: { fontSize: '0.75rem', color: '#666' },
    btnNoteTrigger: { background: 'white', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' },
    actions: { display: 'flex', gap: '10px', alignItems: 'center' },
    controlGroup: { display: 'flex', flexDirection: 'column' },
    tinyLabel: { fontSize: '0.55rem', color: '#999', textAlign: 'center' },
    selectSmall: { padding: '4px', borderRadius: '4px', fontSize: '0.75rem' },
    btnDelete: { background: 'none', border: 'none', cursor: 'pointer' },
    loader: { textAlign: 'center', marginTop: '50px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: 'white', padding: '20px', borderRadius: '12px', width: '400px' },
    noteContent: { background: '#f5f5f5', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', whiteSpace: 'pre-wrap' },
    btnCancel: { background: '#eee', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }
};

export default Material;