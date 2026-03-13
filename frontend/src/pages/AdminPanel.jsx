import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRole, resetPassword } from '../services/api';

/**
 * PANEL DE ADMINISTRACIÓN AE
 * Permite la gestión de usuarios, roles y contraseñas.
 */
const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            setError('No se pudieron cargar los usuarios. Verifique permisos.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, username) => {
        if (window.confirm(`¿Está seguro de dar de baja al usuario ${username}?`)) {
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
        const newPass = prompt(`Ingrese la nueva contraseña para ${username}:`);
        if (newPass && newPass.length >= 6) {
            try {
                await resetPassword(id, newPass);
                alert('Contraseña actualizada correctamente');
            } catch (err) {
                alert('Error al resetear contraseña');
            }
        } else if (newPass) {
            alert('La contraseña debe tener al menos 6 caracteres');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Cargando personal...</div>;

    return (
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#1b3a57', marginBottom: '20px', borderBottom: '2px solid #1b3a57', paddingBottom: '10px' }}>
                Gestión de Personal y Permisos
            </h2>

            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={styles.th}>Usuario</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Rango/Permiso</th>
                            <th style={styles.th}>Acciones de Mando</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={styles.td}><strong>{user.username}</strong></td>
                                <td style={styles.td}>{user.email}</td>
                                <td style={styles.td}>
                                    <select 
                                        value={user.role} 
                                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="user">Usuario (Carga)</option>
                                        <option value="boss">Jefe (Solo Lectura)</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </td>
                                <td style={styles.td}>
                                    <button 
                                        onClick={() => handleResetPass(user._id, user.username)}
                                        style={{ ...styles.btn, backgroundColor: '#f0ad4e' }}
                                    >
                                        🔑 Reset Clave
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(user._id, user.username)}
                                        style={{ ...styles.btn, backgroundColor: '#d9534f' }}
                                    >
                                        🗑️ Dar de Baja
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    th: { padding: '12px', textAlign: 'left', color: '#495057' },
    td: { padding: '12px' },
    select: { padding: '5px', borderRadius: '4px', border: '1px solid #ccc' },
    btn: {
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '8px',
        fontSize: '0.85rem',
        fontWeight: 'bold'
    }
};

export default AdminPanel;