import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRole, resetPassword, register } from '../services/api';

/**
 * PANEL DE ADMINISTRACIÓN CENTRALIZADO - SISTEMA AE
 * Actualizado con la nueva jerarquía de 10 roles operativos.
 */
const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [newUser, setNewUser] = useState({
        username: '',    // GDE
        nombreReal: '',  // Usuario
        elemento: '',    // Unidad
        password: '',
        role: 'user'     // Sincronizado con minúsculas
    });

    // LISTA OFICIAL DE ROLES AE
    const rolesDisponibles = [
        { val: 'admin', label: 'ADMIN' },
        { val: 'BOSS', label: 'BOSS' },
        { val: 'OTO', label: 'OTO' },
        { val: 'DIRECTOR', label: 'DIRECTOR' },
        { val: 'user', label: 'USER (Consulta)' },
        { val: 'OFICINA_TECNICA', label: 'OFICINA TÉCNICA' },
        { val: 'OPERACIONES', label: 'OPERACIONES' },
        { val: 'JEFE', label: 'JEFE' },
        { val: 'LOGISTICO', label: 'LOGÍSTICO' },
        { val: 'PERSONAL', label: 'PERSONAL' }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getUsers();
            if (response.data && response.data.data) {
                const sortedUsers = response.data.data.sort((a, b) => {
                    if (a.elemento < b.elemento) return -1;
                    if (a.elemento > b.elemento) return 1;
                    return 0;
                });
                setUsers(sortedUsers);
            } else {
                setUsers([]);
            }
            setError('');
        } catch (err) {
            setError('Error de conexión: No se pudo acceder al registro de personal.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                ...newUser,
                email: `${newUser.username.toLowerCase()}@ae.mil.ar`, 
            };
            await register(payload);
            alert(`Personal: ${newUser.nombreReal} incorporado correctamente.`);
            setNewUser({ username: '', nombreReal: '', elemento: '', password: '', role: 'user' });
            fetchUsers(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Error al registrar.');
        }
    };

    const handleDelete = async (id, nombre) => {
        if (window.confirm(`⚠️ BAJA DEFINITIVA: ¿Confirma la eliminación de ${nombre}?`)) {
            try {
                await deleteUser(id);
                fetchUsers();
            } catch (err) {
                alert('No se pudo procesar la baja.');
            }
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await updateUserRole(id, newRole);
            fetchUsers();
        } catch (err) {
            alert('Error al actualizar permisos.');
        }
    };

    const handleResetPass = async (id, nombre) => {
        const newPass = prompt(`Nueva clave para: ${nombre}:`);
        if (newPass && newPass.length >= 6) {
            try {
                await resetPassword(id, newPass);
                alert('Clave actualizada.');
            } catch (err) {
                alert('Error al resetear clave.');
            }
        } else if (newPass) {
            alert('Mínimo 6 caracteres.');
        }
    };

    if (loading) return <div style={styles.loader}>Sincronizando Personal AE...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '20px' }}>
            
            {/* FORMULARIO DE ALTA */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Incorporación de Personal</h3>
                <form onSubmit={handleCreateUser} style={styles.formInline}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre y Apellido</label>
                        <input type="text" placeholder="Ej: Juan Pérez" required value={newUser.nombreReal} 
                               onChange={e => setNewUser({...newUser, nombreReal: e.target.value})} style={styles.input} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>GDE</label>
                        <input type="text" placeholder="JPEREZ_AE" required value={newUser.username} 
                               onChange={e => setNewUser({...newUser, username: e.target.value})} style={styles.input} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Elemento</label>
                        <input type="text" placeholder="Ej: B HELIC ASAL 601" required value={newUser.elemento} 
                               onChange={e => setNewUser({...newUser, elemento: e.target.value})} style={styles.input} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Clave</label>
                        <input type="password" placeholder="Min. 6" required value={newUser.password} 
                               onChange={e => setNewUser({...newUser, password: e.target.value})} style={styles.input} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Rol de Acceso</label>
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={styles.select}>
                            {rolesDisponibles.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                        </select>
                    </div>
                    <button type="submit" style={styles.btnRegister}>Dar de Alta</button>
                </form>
            </div>

            {/* TABLA DE PERSONAL */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Escalafón y Control de Acceso</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}>Nombre</th>
                                <th style={styles.th}>GDE</th>
                                <th style={styles.th}>Elemento</th>
                                <th style={styles.th}>Nivel de Acceso</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id} style={styles.tbodyRow}>
                                    <td style={{...styles.td, fontWeight: '500'}}>{u.nombreReal}</td>
                                    <td style={styles.td}><span style={styles.gdeBadge}>{u.username}</span></td>
                                    <td style={styles.td}>{u.elemento}</td>
                                    <td style={styles.td}>
                                        <select 
                                            value={u.role} 
                                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                            style={{
                                                ...styles.roleSelect,
                                                color: (u.role === 'admin' || u.role === 'DIRECTOR') ? '#d9534f' : '#2980b9'
                                            }}
                                        >
                                            {rolesDisponibles.map(r => <option key={r.val} value={r.val}>{r.val}</option>)}
                                        </select>
                                    </td>
                                    <td style={styles.td}>
                                        <button onClick={() => handleResetPass(u._id, u.nombreReal)} style={{ ...styles.actionBtn, backgroundColor: '#f0ad4e' }}>🔑 Reset</button>
                                        <button onClick={() => handleDelete(u._id, u.nombreReal)} style={{ ...styles.actionBtn, backgroundColor: '#d9534f' }}>🗑️ Baja</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const styles = {
    loader: { textAlign: 'center', marginTop: '50px', fontWeight: 'bold', color: '#1b3a57' },
    card: { backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    cardTitle: { color: '#1b3a57', marginTop: 0, marginBottom: '20px', borderLeft: '5px solid #1b3a57', paddingLeft: '15px', fontSize: '1rem', fontWeight: 'bold' },
    formInline: { display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '150px' },
    label: { fontSize: '0.65rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.85rem' },
    select: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '0.85rem' },
    btnRegister: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '11px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    table: { width: '100%', borderCollapse: 'collapse' },
    theadRow: { backgroundColor: '#f8f9fa' },
    th: { padding: '12px', textAlign: 'left', color: '#444', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' },
    tbodyRow: { borderBottom: '1px solid #eee' },
    td: { padding: '12px', fontSize: '0.8rem', color: '#333' },
    gdeBadge: { backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '0.75rem' },
    roleSelect: { padding: '5px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.75rem', fontWeight: 'bold' },
    actionBtn: { color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.65rem', fontWeight: 'bold' }
};

export default AdminPanel;