import React, { useEffect, useState } from 'react';
import { getAircrafts, updateAircraftStatus, createAircraft, deleteAircraft } from '../services/api';

const Material = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null); 
    const [isEditing, setIsEditing] = useState(false); // Estado para saber si estamos editando
    
    // NORMALIZACIÓN DE SESIÓN (SINCRO JOKER)
    const rawRole = localStorage.getItem('role') || "";
    const role = rawRole.trim(); 
    
    const userElemento = localStorage.getItem('elemento')?.toUpperCase().trim() || "";
    const userName = localStorage.getItem('username') || 'Usuario';

    // Definición de permisos jerárquicos estrictos
    const isAdmin = role === 'admin';
    const isMando = ['admin', 'BOSS', 'DIRECTOR', 'OTO'].includes(role);
    
    // Privilegios de edición: Mandos, Oficina Técnica y S4 Unidad
    const hasEditPrivileges = isMando || role.toUpperCase() === 'OFICINA_TECNICA' || role.toUpperCase() === 'S4_UNIDAD';

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
        vencimientoRAAC91217: '',
        vencimientoRAAC91411: '',
        vencimientoRAAC91413: ''
    };

    const [newAir, setNewAir] = useState(initialFormState);

    useEffect(() => {
        if (role) {
            fetchMaterial();
        }
    }, [role, userElemento]);

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

    // Cargar datos en el formulario para editar
    const handleEditClick = (air) => {
        setIsEditing(true);
        setNewAir({
            ...air,
            unidadDestino: air.unidad, // Para que el select de admin sepa que unidad es
            motores: air.motores?.length ? air.motores : [{ horas: 0, fecha: '' }],
            helices: air.helices?.length ? air.helices : [{ horas: 0, fecha: '' }]
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setNewAir(initialFormState);
    };

    // Manejadores para campos dinámicos
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
        
        const unidadFinal = isAdmin ? newAir.unidadDestino : userElemento;
        if (!unidadFinal) return alert("Debe seleccionar una unidad de destino.");

        const timestamp = `[Modificado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} por ${userName}]`;

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
                payload.creadoPor = `${userName} (${role})`;
                await createAircraft(payload);
                alert(`Aeronave registrada correctamente en ${unidadFinal}.`);
            }

            cancelEdit();
            await fetchMaterial();
        } catch (error) {
            alert("Error de Operación: Verifique sus permisos o conexión.");
        }
    };

    const handleUpdateField = async (id, updatedFields) => {
        try {
            const targetAir = aircrafts.find(a => a._id === id);
            if (!targetAir) return;
            const targetUnidad = String(targetAir.unidad).toUpperCase().trim();
            if (!isMando && targetUnidad !== userElemento) return alert("Seguridad: Sin permisos.");
            
            const fullUpdatedObject = { ...targetAir, ...updatedFields };
            await updateAircraftStatus(id, fullUpdatedObject);
            setAircrafts(prev => prev.map(a => a._id === id ? { ...a, ...updatedFields } : a));
        } catch (error) {
            alert("Error al actualizar estado/horas.");
        }
    };

    const handleSaveNote = async (id, text, isClear = false) => {
        const fullNote = isClear ? "" : `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}] ${userName}: ${text}`;
        await handleUpdateField(id, { novedades: fullNote });
        setSelectedNote(null);
    };

    const handleDelete = async (id) => {
        const targetAir = aircrafts.find(a => a._id === id);
        if (!targetAir || (!isMando && String(targetAir.unidad).toUpperCase().trim() !== userElemento)) return alert("No autorizado.");
        if (!window.confirm("¿Confirmar eliminación?")) return;
        try {
            await deleteAircraft(id);
            setAircrafts(prev => prev.filter(a => a._id !== id));
        } catch (error) {
            alert("Error al eliminar.");
        }
    };

    if (loading) return <div style={styles.loader}>Sincronizando material aéreo...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                {hasEditPrivileges ? (
                    <div style={styles.card}>
                        <h3 style={styles.title}>{isEditing ? "🔄 Actualizar Aeronave" : "➕ Alta de Aeronave"}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            
                            {(isAdmin || isEditing) && (
                                <div style={styles.field}>
                                    <label style={{...styles.label, color: '#e67e22'}}>📍 Unidad</label>
                                    <select 
                                        value={newAir.unidadDestino} 
                                        onChange={e => setNewAir({...newAir, unidadDestino: e.target.value})} 
                                        style={{...styles.input, border: '1px solid #e67e22'}} 
                                        required
                                        disabled={isEditing && !isAdmin}
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
                                <label style={styles.label}>Horas de Planeador</label>
                                <input type="number" value={newAir.horasPlaneador} onChange={e => setNewAir({...newAir, horasPlaneador: e.target.value})} style={styles.input} />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Motores (Horas + Fecha)</label>
                                {newAir.motores.map((m, idx) => (
                                    <div key={idx} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                                        <input type="number" placeholder="Hs" value={m.horas} onChange={e => updateMotor(idx, 'horas', e.target.value)} style={{...styles.input, flex: 1}} />
                                        <input type="date" value={m.fecha ? m.fecha.split('T')[0] : ''} onChange={e => updateMotor(idx, 'fecha', e.target.value)} style={{...styles.input, flex: 1}} />
                                        {idx === newAir.motores.length - 1 && <button type="button" onClick={addMotor} style={styles.btnAddSmall}>+</button>}
                                    </div>
                                ))}
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Hélices (Horas + Fecha)</label>
                                {newAir.helices.map((h, idx) => (
                                    <div key={idx} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                                        <input type="number" placeholder="Hs" value={h.horas} onChange={e => updateHelice(idx, 'horas', e.target.value)} style={{...styles.input, flex: 1}} />
                                        <input type="date" value={h.fecha ? h.fecha.split('T')[0] : ''} onChange={e => updateHelice(idx, 'fecha', e.target.value)} style={{...styles.input, flex: 1}} />
                                        {idx === newAir.helices.length - 1 && <button type="button" onClick={addHelice} style={styles.btnAddSmall}>+</button>}
                                    </div>
                                ))}
                            </div>

                            <div style={styles.field}><label style={styles.label}>Vto Seguro</label><input type="date" value={newAir.vencimientoSeguro?.split('T')[0] || ''} onChange={e => setNewAir({...newAir, vencimientoSeguro: e.target.value})} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Vto Aviónica</label><input type="date" value={newAir.vencimientoAvionica?.split('T')[0] || ''} onChange={e => setNewAir({...newAir, vencimientoAvionica: e.target.value})} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Vto RAAC 91.217</label><input type="date" value={newAir.vencimientoRAAC91217?.split('T')[0] || ''} onChange={e => setNewAir({...newAir, vencimientoRAAC91217: e.target.value})} style={styles.input} /></div>
                            
                            <div style={styles.field}>
                                <label style={styles.label}>Novedades</label>
                                <textarea value={newAir.novedades} onChange={e => setNewAir({...newAir, novedades: e.target.value})} style={{...styles.input, height: '60px', resize: 'none'}} />
                            </div>

                            <div style={{display: 'flex', gap: '10px'}}>
                                <button type="submit" style={{...styles.btnPrimary, flex: 2}}>
                                    {isEditing ? "Confirmar Cambios" : "Registrar Aeronave"}
                                </button>
                                {isEditing && <button type="button" onClick={cancelEdit} style={styles.btnCancel}>Anular</button>}
                            </div>
                        </form>
                    </div>
                ) : (
                    <div style={styles.card}>
                        <h3 style={styles.title}>📋 Información de Unidad</h3>
                        <p style={{fontSize: '0.9rem', color: '#666'}}>Operando en: <strong>{userElemento}</strong></p>
                    </div>
                )}

                <div style={styles.card}>
                    <h3 style={styles.title}>🛠️ Gestión de Material</h3>
                    <div style={styles.scrollList}>
                        {aircrafts.map(air => (
                            <div key={air._id} style={{...styles.item, borderLeft: air.estado === 'E/S' ? '6px solid #28a745' : '6px solid #e74c3c'}}>
                                <div style={{flex: 1.2}}>
                                    <div style={styles.itemMain}>{air.matricula}</div>
                                    <div style={styles.itemSub}>{air.sda} | <strong>{air.unidad}</strong></div>
                                    <div style={{display:'flex', gap: '5px'}}>
                                        <button onClick={() => setSelectedNote(air)} style={{...styles.btnNoteTrigger, background: air.novedades ? '#fff3cd' : '#eef2f7'}}>
                                            {air.novedades ? "📋 Ver" : "➕ Nota"}
                                        </button>
                                        {hasEditPrivileges && (
                                            <button onClick={() => handleEditClick(air)} style={{...styles.btnNoteTrigger, background: '#e3f2fd', borderColor: '#2196f3'}}>
                                                📝 Actualizar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={styles.actions}>
                                    <div style={styles.controlGroup}>
                                        <label style={styles.tinyLabel}>ESTADO</label>
                                        <select 
                                            value={air.estado || 'E/S'} 
                                            disabled={!hasEditPrivileges}
                                            onChange={(e) => handleUpdateField(air._id, { estado: e.target.value })} 
                                            style={{...styles.selectSmall, color: air.estado === 'E/S' ? '#28a745' : '#e74c3c'}}
                                        >
                                            <option value="E/S">E/S</option>
                                            <option value="F/S">F/S</option>
                                        </select>
                                    </div>
                                    <div style={styles.controlGroup}>
                                        <label style={styles.tinyLabel}>HS REM</label>
                                        <input 
                                            type="number" 
                                            defaultValue={air.horasRemanentes || 0} 
                                            disabled={!hasEditPrivileges}
                                            onBlur={(e) => handleUpdateField(air._id, { horasRemanentes: e.target.value })} 
                                            style={styles.inputSmall} 
                                        />
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
                        <h4 style={{marginTop: 0, color: '#1b3a57'}}>Novedades: {selectedNote.matricula}</h4>
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
    grid: { display: 'grid', gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '1fr 1.5fr', gap: '25px' },
    card: { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f0f2f5' },
    title: { marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: '#1b3a57', borderBottom: '2px solid #f8f9fa', paddingBottom: '10px', fontWeight: 'bold' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    field: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none' },
    btnPrimary: { background: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    btnAddSmall: { background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '30px', cursor: 'pointer', fontWeight: 'bold' },
    scrollList: { maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' },
    item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fcfcfc', borderRadius: '10px', marginBottom: '12px', border: '1px solid #eee' },
    itemMain: { fontWeight: 'bold', fontSize: '1.1rem', color: '#1b3a57' },
    itemSub: { fontSize: '0.8rem', color: '#777', marginBottom: '8px' },
    btnNoteTrigger: { border: '1px solid #ddd', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' },
    actions: { display: 'flex', gap: '10px', alignItems: 'center' },
    controlGroup: { display: 'flex', flexDirection: 'column', gap: '2px' },
    tinyLabel: { fontSize: '0.6rem', fontWeight: 'bold', color: '#999', textAlign: 'center' },
    selectSmall: { padding: '6px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', fontSize: '0.8rem' },
    inputSmall: { width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.8rem' },
    btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' },
    loader: { textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: '#1b3a57' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '450px' },
    noteContent: { background: '#f8f9fa', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', color: '#444', borderLeft: '4px solid #1b3a57', whiteSpace: 'pre-wrap' },
    btnCancel: { background: '#eee', color: '#666', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Material;