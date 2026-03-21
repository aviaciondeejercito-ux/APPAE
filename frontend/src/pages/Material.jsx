import React, { useEffect, useState } from 'react';
import { getAircrafts, updateAircraftStatus, createAircraft, deleteAircraft } from '../services/api';

const Material = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null); // Para el Pop-up de novedades
    
    const role = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento')?.trim() || "";
    const userName = localStorage.getItem('username') || 'Usuario';

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const [newAir, setNewAir] = useState({
        matricula: '',
        sda: '',
        horasRemanentes: 0,
        novedades: '' // Unificado con Backend
    });

    useEffect(() => {
        if (role) {
            fetchMaterial();
        }
    }, [role, userElemento]);

    const fetchMaterial = async () => {
        try {
            setLoading(true);
            const { data } = await getAircrafts();
            const filtrados = (role === 'admin' || role === 'boss') 
                ? data 
                : data.filter(a => 
                    a.unidad && 
                    userElemento && 
                    String(a.unidad).toUpperCase() === String(userElemento).toUpperCase()
                );
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo de sincronización de material");
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newAir.matricula || !newAir.sda) return alert("Faltan campos obligatorios");
        if (!userElemento) return alert("Error de sesión: Unidad no detectada.");

        try {
            const payload = {
                matricula: newAir.matricula.toUpperCase().trim(),
                sda: newAir.sda,
                horasRemanentes: Number(newAir.horasRemanentes) || 0,
                unidad: userElemento,
                estado: 'E/S',
                novedades: newAir.novedades ? `[${new Date().toLocaleDateString()}] ${userName}: ${newAir.novedades}` : '',
                creadoPor: userName // Requerido por el modelo
            };

            await createAircraft(payload);
            setNewAir({ matricula: '', sda: '', horasRemanentes: 0, novedades: '' });
            await fetchMaterial();
            alert("Aeronave registrada correctamente.");
        } catch (error) {
            alert("Error al dar de alta el material.");
        }
    };

    const handleUpdateField = async (id, updatedFields) => {
        try {
            const targetAir = aircrafts.find(a => a._id === id);
            if (!targetAir) return;

            // Verificación de seguridad local (el backend también lo hace)
            if (role !== 'admin' && role !== 'boss' && String(targetAir.unidad).trim() !== String(userElemento).trim()) {
                return alert("Seguridad: No tiene permisos sobre esta unidad.");
            }

            const cleanFields = { ...updatedFields };
            if (cleanFields.horasRemanentes !== undefined) cleanFields.horasRemanentes = Number(cleanFields.horasRemanentes);
            
            await updateAircraftStatus(id, cleanFields);
            
            // Actualización optimista del estado local
            setAircrafts(prev => prev.map(a => a._id === id ? { ...a, ...cleanFields } : a));
        } catch (error) {
            alert("Error al actualizar servidor.");
        }
    };

    const handleSaveNote = async (id, text, isClear = false) => {
        const fullNote = isClear ? "" : `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}] ${userName}: ${text}`;
        await handleUpdateField(id, { novedades: fullNote });
        setSelectedNote(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Confirmar eliminación del registro oficial?")) return;
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
                
                {/* ALTA DE MATERIAL */}
                <div style={styles.card}>
                    <h3 style={styles.title}>➕ Alta de Material Aéreo</h3>
                    <form onSubmit={handleCreate} style={styles.form}>
                        <div style={styles.field}>
                            <label style={styles.label}>Matrícula (AE-XXX)</label>
                            <input type="text" value={newAir.matricula} onChange={e => setNewAir({...newAir, matricula: e.target.value})} style={styles.input} required />
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
                            <label style={styles.label}>Novedades Iniciales</label>
                            <textarea value={newAir.novedades} onChange={e => setNewAir({...newAir, novedades: e.target.value})} style={{...styles.input, height: '60px', resize: 'none'}} placeholder="Ej: Próxima inspección de 100hs..." />
                        </div>
                        <button type="submit" style={styles.btnPrimary}>Registrar en {userElemento}</button>
                    </form>
                </div>

                {/* LISTADO Y GESTIÓN */}
                <div style={styles.card}>
                    <h3 style={styles.title}>🛠️ Gestión y Novedades</h3>
                    <div style={styles.scrollList}>
                        {aircrafts.map(air => (
                            <div key={air._id} style={{...styles.item, borderLeft: air.estado === 'E/S' ? '6px solid #28a745' : '6px solid #e74c3c'}}>
                                <div style={{flex: 1.2}}>
                                    <div style={styles.itemMain}>{air.matricula}</div>
                                    <div style={styles.itemSub}>{air.sda}</div>
                                    <button onClick={() => setSelectedNote(air)} style={{...styles.btnNoteTrigger, background: air.novedades ? '#fff3cd' : '#eef2f7'}}>
                                        {air.novedades ? "📋 Ver Novedades" : "➕ Agregar Nota"}
                                    </button>
                                </div>

                                <div style={styles.actions}>
                                    <div style={styles.controlGroup}>
                                        <label style={styles.tinyLabel}>ESTADO</label>
                                        <select value={air.estado} onChange={(e) => handleUpdateField(air._id, { estado: e.target.value })} style={{...styles.selectSmall, color: air.estado === 'E/S' ? '#28a745' : '#e74c3c'}}>
                                            <option value="E/S">E/S</option>
                                            <option value="F/S">F/S</option>
                                        </select>
                                    </div>
                                    <div style={styles.controlGroup}>
                                        <label style={styles.tinyLabel}>HS REM</label>
                                        <input type="number" value={air.horasRemanentes} onChange={(e) => handleUpdateField(air._id, { horasRemanentes: e.target.value })} style={styles.inputSmall} />
                                    </div>
                                    {role === 'admin' && <button onClick={() => handleDelete(air._id)} style={styles.btnDelete}>🗑️</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* POP-UP MODAL DE NOVEDADES (MODIFICADO) */}
            {selectedNote && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h4 style={{marginTop: 0, color: '#1b3a57'}}>Gestión de Novedades: {selectedNote.matricula}</h4>
                        <div style={styles.noteContent}>
                            <strong>Registro Actual:</strong><br/>
                            {selectedNote.novedades || "Sin novedades registradas."}
                        </div>
                        
                        <textarea 
                            id="newNoteText"
                            placeholder="Escribir nueva novedad (esto reemplazará la anterior)..." 
                            style={{...styles.input, width: '100%', height: '80px', marginTop: '15px', boxSizing: 'border-box'}}
                        />
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px'}}>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button onClick={() => {
                                    const val = document.getElementById('newNoteText').value;
                                    if(val) handleSaveNote(selectedNote._id, val);
                                }} style={{...styles.btnPrimary, flex: 2, margin: 0}}>Actualizar Registro</button>
                                
                                <button onClick={() => {
                                    if(window.confirm("¿Limpiar todas las novedades de esta aeronave?")) {
                                        handleSaveNote(selectedNote._id, "", true);
                                    }
                                }} style={styles.btnClear}>Limpiar</button>
                            </div>
                            <button onClick={() => setSelectedNote(null)} style={styles.btnCancel}>Cerrar sin cambios</button>
                        </div>
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
    modal: { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
    noteContent: { background: '#f8f9fa', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', color: '#444', borderLeft: '4px solid #1b3a57', minHeight: '50px', whiteSpace: 'pre-wrap', marginBottom: '10px' },
    btnCancel: { background: '#eee', color: '#666', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    btnClear: { background: '#e74c3c', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }
};

export default Material;