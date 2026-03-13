import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRole, resetPassword, register } from '../services/api';

/**
 * PANEL DE ADMINISTRACIÓN CENTRALIZADO
 * Seguridad: Alta, Baja, Cambio de Roles y Reset de Claves.
 */
const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Estado para el formulario de Alta
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await getUsers();
            setUsers(data);
            setError('');
        } catch (err) {
            setError('Error de conexión: No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await register(newUser);
            alert(`Usuario ${newUser.username} creado correctamente.`);
            setNewUser({ username: '', email: '', password: '', role: 'user' });
            fetchUsers(); // Actualización inmediata de la lista
        } catch (err) {
            alert('Error al crear el usuario. El nombre o email ya podrían existir.');
        }
    };

    const handleDelete = async (id, username) => {
        if (window.confirm(`⚠️ ADVERTENCIA: ¿Está seguro de dar de BAJA al usuario ${username}?`)) {
            try {
                await deleteUser(id);
                fetchUsers();
            } catch (err) {
                alert('Error al eliminar usuario');
            }
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await updateUserRole(id, newRole);
            fetchUsers();
        } catch (err) {
            alert('Error al actualizar permisos');
        }
    };

    const handleResetPass = async (id, username) => {
        const newPass = prompt(`Generar nueva contraseña para ${username}:`);
        if (newPass && newPass.length >= 6) {
            try {
                await resetPassword(id, newPass);
                alert('Contraseña actualizada con éxito');
            } catch (err) {
                alert('Error al resetear contraseña');
            }
        } else if (newPass) {
            alert('La clave debe tener al menos 6 caracteres.');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Accediendo al registro de personal...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* SECCIÓN 1: ALTA DE USUARIOS */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Alta de Nuevo Personal</h3>
                <form onSubmit={handleCreateUser} style={styles.formInline}>
                    <input 
                        type="text" placeholder="Usuario" required 
                        value={newUser.username} 
                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                        style={styles.input}
                    />
                    <input 
                        type="email" placeholder="Email" required 
                        value={newUser.email} 
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                        style={styles.input}
                    />
                    <input 
                        type="password" placeholder="Clave inicial" required 
                        value={newUser.password} 
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        style={styles.input}
                    />
                    <select 
                        value={newUser.role} 
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                        style={styles.select}
                    >
                        <option value="user">Usuario (Carga)</option>
                        <option value="boss">Boss (Solo Lectura)</option>
                        <option value="admin">Administrador</option>
                    </select>
                    <button type="submit" style={styles.btnRegister}>Registrar Miembro</button>
                </form>
            </div>

            {/* SECCIÓN 2: LISTADO Y PERMISOS */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Gestión de Personal y Permisos</h3>
                {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Rango / Permiso</th>
                                <th style={styles.th}>Acciones de Mando</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id} style={styles.tbodyRow}>
                                    <td style={styles.td}><strong>{user.username}</strong></td>
                                    <td style={styles.td}>{user.email}</td>
                                    <td style={styles.td}>
                                        <select 
                                            value={user.role} 
                                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                            style={styles.roleSelect}
                                        >
                                            <option value="user">Usuario</option>
                                            <option value="boss">Boss</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => handleResetPass(user._id, user.username)}
                                            style={{ ...styles.actionBtn, backgroundColor: '#f0ad4e' }}
                                        >
                                            🔑 Reset Clave
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user._id, user.username)}
                                            style={{ ...styles.actionBtn, backgroundColor: '#d9534f' }}
                                        >
                                            🗑️ Baja
                                        </button>
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

// Estilos limpios y profesionales
const styles = {
    card: {
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    cardTitle: {
        color: '#1b3a57',
        marginTop: 0,
        marginBottom: '20px',
        borderBottom: '2px solid #1b3a57',
        paddingBottom: '10px'
    },
    formInline: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px'
    },
    input: {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        flex: '1',
        minWidth: '150px'
    },
    select: {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: '#fff'
    },
    btnRegister: {
        backgroundColor: '#1b3a57',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    theadRow: {
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6'
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        color: '#495057',
        fontSize: '0.9rem'
    },
    tbodyRow: {
        borderBottom: '1px solid #eee'
    },
    td: {
        padding: '12px',
        fontSize: '0.9rem'
    },
    roleSelect: {
        padding: '5px',
        borderRadius: '4px',
        border: '1px solid #ccc'
    },
    actionBtn: {
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '8px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
    }
};

export default AdminPanel;