import React, { useEffect, useState } from 'react';
import { getAircrafts, updateAircraftStatus, createAircraft, deleteAircraft } from '../services/api';

const Material = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null); 
    const [isEditing, setIsEditing] = useState(false); 
    
    // NORMALIZACIÓN DE SESIÓN
    const rawRole = localStorage.getItem('role') || "";
    const roleUpper = String(rawRole).trim().toUpperCase().replace(/[\s_]/g, '');
    const roleLower = String(rawRole).trim().toLowerCase().replace(/[\s_]/g, '');
    
    const userElemento = localStorage.getItem('elemento')?.toUpperCase().trim() || "";
    const userName = localStorage.getItem('username') || 'Usuario';

    // VERIFICACIÓN MULTI-CAPA DE ROLES
    const esAdminPorContenido = roleUpper.includes('ADMIN') || roleLower.includes('admin');
    const esMandoPorLista = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleUpper) || 
                            ['admin', 'boss', 'director', 'oto'].includes(roleLower);
    
    const isMandoEstrategico = esAdminPorContenido || esMandoPorLista || userElemento === 'COMANDO';
    
    // CORRECCIÓN DE REGLA DE NEGOCIO:
    // 1. Ver todo la flota: FALSO para Oficina Técnica. Solo permitido para Mandos Estratégicos globales.
    const canViewAll = isMandoEstrategico;

    // 2. Capacidad de transferir / enviar a otra unidad de destino
    const esOficinaTecnica = roleUpper === 'OFICINATECNICA' || roleLower === 'oficinatecnica';
    const canChangeUnit = isMandoEstrategico || esOficinaTecnica;
    
    // 3. Privilegios generales de edición en el formulario
    const hasEditPrivileges = canChangeUnit || roleUpper === 'S4UNIDAD' || roleLower === 's4unidad';

    const sdaList = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"];
    const unidadesAE = ["B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"];

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
        vencimientoRAAC91207: '',
        vencimientoRAAC91411: '',
        vencimientoRAAC91413: ''
    };

    const [newAir, setNewAir] = useState(initialFormState);

    useEffect(() => {
        fetchMaterial();
    }, [roleUpper, userElemento]);

    const fetchMaterial = async () => {
        try {
            setLoading(true);
            const { data } = await getAircrafts();
            
            // CONTROL RESTRICTIVO LOCAL: Si no puede ver todo, se autofiltran por la unidad del usuario de Oficina Técnica
            const filtrados = canViewAll 
                ? data 
                : data.filter(a => a.unidad?.toUpperCase().trim() === userElemento);
                
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo de sincronización");
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

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
    };

    const addMotor = () => setNewAir({ ...newAir, motores: [...newAir.motores, { horas: 0, fecha: '' }] });
    const updateMotor = (idx, field, val) => {
        const updated = [...newAir.motores];
        updated[idx][field] = val;
        setNewAir({ ...newAir, motores: updated });
    };

    const addHelice = () => setNewAir({ ...newAir, helices: [...newAir.helices, { horas: 0, fecha: '' }] });
    const updateHelice = (idx, field, val) => {
        const updated = [...newAir.helices];
        updated[idx][field] = val;
        setNewAir({ ...newAir, helices: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Si el usuario tiene permisos de traspaso, toma el valor seleccionado del combobox, sino autoasigna su propio elemento
        const unidadFinal = canChangeUnit ? (newAir.unidadDestino || userElemento) : userElemento;
        if (!newAir.matricula || !newAir.sda || !unidadFinal) return alert("Faltan datos obligatorios.");

        try {
            const payload = {
                ...newAir,
                unidad: unidadFinal,
                horasRemanentes: Number(newAir.horasRemanentes),
                horasPlaneador: Number(newAir.horasPlaneador)
            };

            if (isEditing) {
                await updateAircraftStatus(newAir._id, payload);
                alert("Aeronave procesada / transferida correctamente.");
            } else {
                payload.creadoPor = `${userName} (${rawRole})`;
                await createAircraft(payload);
                alert("Alta de aeronave exitosa.");
            }
            cancelEdit();
            fetchMaterial(); // Al recargar, si Oficina Técnica la mandó a otra unidad, ya no figurará en su feed
        } catch (error) { alert("Error en la operación."); }
    };

    const handleUpdateField = async (id, updatedFields) => {
        try {
            const target = aircrafts.find(a => a._id === id);
            await updateAircraftStatus(id, { ...target, ...updatedFields });
            setAircrafts(prev => prev.map(a => a._id === id ? { ...a, ...updatedFields } : a));
        } catch (error) { alert("Error al actualizar."); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Confirmar baja definitiva?")) return;
        try {
            await deleteAircraft(id);
            setAircrafts(prev => prev.filter(a => a._id !== id));
        } catch (error) { alert("Error al eliminar."); }
    };

    if (loading) return <div style={styles.loader}>Sincronizando material aéreo...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                {hasEditPrivileges ? (
                    <div style={styles.card}>
                        <h3 style={styles.title}>{isEditing ? "🔄 Editar / Transferir Aeronave" : "➕ Alta de Aeronave"}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            
                            {/* EL SELECTOR DE DESTINO APARECE PORQUE TIENE PRIVILEGIO canChangeUnit */}
                            {canChangeUnit && (
                                <div style={styles.field}>
                                    <label style={styles.label}>🚀 Enviar / Asignar a Unidad Destino</label>
                                    <select value={newAir.unidadDestino} onChange={e => setNewAir({...newAir, unidadDestino: e.target.value})} style={{...styles.input, border: '1px solid #e67e22'}} required>
                                        <option value="">Seleccione Unidad Destino...</option>
                                        {unidadesAE.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            )}

                            <div style={styles.rowForm}>
                                <div style={{...styles.field, flex: 1}}><label style={styles.label}>Matrícula</label><input type="text" value={newAir.matricula} onChange={e => setNewAir({...newAir, matricula: e.target.value})} style={styles.input} required disabled={isEditing} /></div>
                                <div style={{...styles.field, flex: 1}}><label style={styles.label}>SdA</label><select value={newAir.sda} onChange={e => setNewAir({...newAir, sda: e.target.value})} style={styles.input} required><option value="">SdA...</option>{sdaList.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            </div>

                            <div style={styles.rowForm}>
                                <div style={{...styles.field, flex: 1}}><label style={styles.label}>Hs Remanentes</label><input type="number" value={newAir.horasRemanentes} onChange={e => setNewAir({...newAir, horasRemanentes: e.target.value})} style={styles.input} /></div>
                                <div style={{...styles.field, flex: 1}}><label style={styles.label}>Hs Planeador</label><input type="number" value={newAir.horasPlaneador} onChange={e => setNewAir({...newAir, horasPlaneador: e.target.value})} style={styles.input} /></div>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Motores (Horas / Fecha Vto)</label>
                                {newAir.motores.map((m, idx) => (
                                    <div key={idx} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                                        <input type="number" placeholder="Horas" value={m.horas} onChange={e => updateMotor(idx, 'horas', e.target.value)} style={{...styles.input, flex: 1}} />
                                        <input type="date" value={formatDateForInput(m.fecha)} onChange={e => updateMotor(idx, 'fecha', e.target.value)} style={{...styles.input, flex: 1}} />
                                        {idx === newAir.motores.length - 1 && <button type="button" onClick={addMotor} style={styles.btnAddSmall}>+</button>}
                                    </div>
                                ))}
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Hélices (Horas / Fecha Vto)</label>
                                {newAir.helices.map((h, idx) => (
                                    <div key={idx} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                                        <input type="number" placeholder="Horas" value={h.horas} onChange={e => updateHelice(idx, 'horas', e.target.value)} style={{...styles.input, flex: 1}} />
                                        <input type="date" value={formatDateForInput(h.fecha)} onChange={e => updateHelice(idx, 'fecha', e.target.value)} style={{...styles.input, flex: 1}} />
                                        {idx === newAir.helices.length - 1 && <button type="button" onClick={addHelice} style={styles.btnAddSmall}>+</button>}
                                    </div>
                                ))}
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Vencimientos Técnicos RAAC (Inspección)</label>
                                <div style={styles.rowForm}>
                                    <div style={{flex: 1}}><label style={styles.tinyLabel}>91.207 (ELT)</label><input type="date" value={formatDateForInput(newAir.vencimientoRAAC91207)} onChange={e => setNewAir({...newAir, vencimientoRAAC91207: e.target.value})} style={{...styles.input, backgroundColor: '#fff9db'}} /></div>
                                    <div style={{flex: 1}}><label style={styles.tinyLabel}>91.411 (Pitot)</label><input type="date" value={formatDateForInput(newAir.vencimientoRAAC91411)} onChange={e => setNewAir({...newAir, vencimientoRAAC91411: e.target.value})} style={{...styles.input, backgroundColor: '#fff9db'}} /></div>
                                    <div style={{flex: 1}}><label style={styles.tinyLabel}>91.413 (Transp)</label><input type="date" value={formatDateForInput(newAir.vencimientoRAAC91413)} onChange={e => setNewAir({...newAir, vencimientoRAAC91413: e.target.value})} style={{...styles.input, backgroundColor: '#fff9db'}} /></div>
                                </div>
                            </div>

                            <div style={styles.rowForm}>
                                <div style={{flex: 1}}><label style={styles.label}>Vto Seguro</label><input type="date" value={formatDateForInput(newAir.vencimientoSeguro)} onChange={e => setNewAir({...newAir, vencimientoSeguro: e.target.value})} style={styles.input} /></div>
                                <div style={{flex: 1}}><label style={styles.label}>Vto Aviónica</label><input type="date" value={formatDateForInput(newAir.vencimientoAvionica)} onChange={e => setNewAir({...newAir, vencimientoAvionica: e.target.value})} style={styles.input} /></div>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Novedades de la Aeronave</label>
                                <textarea value={newAir.novedades} onChange={e => setNewAir({...newAir, novedades: e.target.value})} style={{...styles.input, height: '60px', resize: 'none'}} />
                            </div>

                            <div style={{display: 'flex', gap: '10px'}}>
                                <button type="submit" style={{...styles.btnPrimary, flex: 2}}>{isEditing ? "Guardar y Transferir" : "Registrar Aeronave"}</button>
                                {isEditing && <button type="button" onClick={cancelEdit} style={styles.btnCancel}>Anular</button>}
                            </div>
                        </form>
                    </div>
                ) : (
                    <div style={styles.card}><h3 style={styles.title}>📋 Vista de Unidad</h3><p>Elemento Operativo: <strong>{userElemento}</strong></p></div>
                )}

                <div style={styles.card}>
                    <h3 style={styles.title}>🛠️ Gestión de Flota ({canViewAll ? "Flota Global" : `Unidad: ${userElemento}`})</h3>
                    <div style={styles.scrollList}>
                        {aircrafts.map(air => (
                            <div key={air._id} style={{...styles.item, borderLeft: air.estado === 'E/S' ? '6px solid #28a745' : '6px solid #e74c3c'}}>
                                <div style={{flex: 1.2}}>
                                    <div style={styles.itemMain}>{air.matricula}</div>
                                    <div style={styles.itemSub}>{air.sda} | {air.unidad}</div>
                                    <div style={{display:'flex', gap: '5px'}}>
                                        <button onClick={() => setSelectedNote(air)} style={styles.btnNoteTrigger}>📋 Notas</button>
                                        {hasEditPrivileges && <button onClick={() => handleEditClick(air)} style={{...styles.btnNoteTrigger, background: '#e3f2fd', color: '#0d47a1'}}>📝 Editar / Transferir</button>}
                                    </div>
                                </div>
                                <div style={styles.actions}>
                                    <div style={styles.controlGroup}>
                                        <label style={styles.tinyLabel}>ESTADO</label>
                                        <select value={air.estado || 'E/S'} disabled={!hasEditPrivileges} onChange={(e) => handleUpdateField(air._id, { estado: e.target.value })} style={styles.selectSmall}>
                                            <option value="E/S">E/S</option>
                                            <option value="F/S">F/S</option>
                                        </select>
                                    </div>
                                    {hasEditPrivileges && <button onClick={() => handleDelete(air._id)} style={styles.btnDelete}>🗑️</button>}
                                </div>
                            </div>
                        ))}
                        {aircrafts.length === 0 && <p style={{color: '#999', fontSize: '0.85rem', textAlign: 'center', marginTop: '20px'}}>No se registran aeronaves asignadas a este elemento operativo.</p>}
                    </div>
                </div>
            </div>

            {selectedNote && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h4 style={{marginTop: 0, color: '#1b3a57'}}>Historial: {selectedNote.matricula}</h4>
                        <div style={styles.noteContent}>{selectedNote.novedades || "Sin novedades registradas."}</div>
                        <button onClick={() => setSelectedNote(null)} style={{...styles.btnCancel, width: '100%', marginTop: '15px'}}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '25px', maxWidth: '1300px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: window.innerWidth < 1000 ? '1fr' : '1fr 1.5fr', gap: '25px' },
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', border: '1px solid #eee' },
    title: { marginTop: 0, fontSize: '1.1rem', color: '#1b3a57', borderBottom: '2px solid #f8f9fa', paddingBottom: '10px', fontWeight: 'bold' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    field: { display: 'flex', flexDirection: 'column', gap: '3px' },
    rowForm: { display: 'flex', gap: '10px' },
    label: { fontSize: '0.65rem', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' },
    tinyLabel: { fontSize: '0.55rem', color: '#888', fontWeight: 'bold' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem', width: '100%', outline: 'none' },
    btnPrimary: { background: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnCancel: { background: '#eee', color: '#444', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' },
    btnAddSmall: { background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', width: '30px', cursor: 'pointer', fontSize: '1.2rem' },
    scrollList: { maxHeight: '650px', overflowY: 'auto', paddingRight: '5px' },
    item: { display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#fcfcfc', borderRadius: '10px', marginBottom: '12px', border: '1px solid #f0f0f0' },
    itemMain: { fontWeight: 'bold', fontSize: '1.1rem', color: '#1b3a57' },
    itemSub: { fontSize: '0.8rem', color: '#666', marginBottom: '8px' },
    btnNoteTrigger: { background: '#fff', border: '1px solid #ddd', padding: '5px 10px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' },
    actions: { display: 'flex', gap: '15px', alignItems: 'center' },
    controlGroup: { display: 'flex', flexDirection: 'column' },
    selectSmall: { padding: '5px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #ccc' },
    btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' },
    loader: { textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: '#1b3a57' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000 },
    modal: { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
    noteContent: { background: '#f8f9fa', padding: '15px', borderRadius: '10px', fontSize: '0.85rem', color: '#333', whiteSpace: 'pre-wrap', borderLeft: '4px solid #1b3a57' }
};

export default Material;