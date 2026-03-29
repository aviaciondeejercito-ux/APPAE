const User = require('../models/User');

/**
 * CONTROLADOR DE ADMINISTRACIÓN AE
 * Seguridad Crítica: Gestión de personal y acceso.
 * Basado en el Estándar de Seguridad para asegurar la integridad de los datos.
 */

// @desc    Obtener todos los usuarios (Lista de Personal)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        // SEGURIDAD: Nunca enviar el hash del password al cliente.
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('❌ Error Crítico en getAllUsers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error de servidor al obtener lista de personal' 
        });
    }
};

// @desc    Actualizar rango o permisos
// @route   PUT /api/admin/users/:id/role
exports.updateRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        
        // JERARQUÍA OFICIAL (Sincronizada exactamente con el Modelo User.js)
        const rolesValidos = [
            'admin', 
            'BOSS', 
            'DIRECTOR', 
            'OTO', 
            'USER', 
            'OFICINA_TECNICA'
        ];
        
        if (!rolesValidos.includes(role)) {
            return res.status(400).json({ 
                success: false,
                message: 'Rango o rol no reconocido por el estándar de seguridad AE' 
            });
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            { role }, 
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) return res.status(404).json({ message: 'Usuario no localizado en la base de datos' });
        
        res.status(200).json({ 
            success: true,
            message: `Jerarquía actualizada: ${user.username} ahora tiene nivel ${role}`,
            data: user 
        });
    } catch (error) {
        console.error('Error en updateRole:', error);
        res.status(500).json({ success: false, message: 'Fallo interno al actualizar permisos' });
    }
};

// @desc    Reseteo forzado de credenciales
// @route   PUT /api/admin/users/:id/password
exports.resetPassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const { password, newPassword, newPass } = req.body;
        const passwordToSet = password || newPassword || newPass;
        
        if (!passwordToSet || passwordToSet.length < 6) {
            return res.status(400).json({ message: 'La nueva clave debe tener mínimo 6 caracteres' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });

        user.password = passwordToSet;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Credenciales de ${user.username} actualizadas con éxito` 
        });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ success: false, message: 'Fallo al resetear credenciales' });
    }
};

// @desc    Baja definitiva de personal
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const requesterId = req.user ? req.user._id.toString() : null;

        if (requesterId && req.params.id === requesterId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Operación denegada: Un administrador no puede darse de baja a sí mismo.' 
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'Usuario no localizado' });
        
        res.status(200).json({ 
            success: true, 
            message: `El usuario GDE: ${user.username} ha sido dado de baja del sistema` 
        });
    } catch (error) {
        console.error('Error en deleteUser:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la baja' });
    }
};

// @desc    Obtener estadísticas rápidas (Para AdminPanel)
// @route   GET /api/admin/stats
exports.getAdminStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'OFICINA_TECNICA' }),
            User.countDocuments({ role: 'DIRECTOR' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers: stats[0],
                admins: stats[1],
                oficinaTecnica: stats[2],
                directores: stats[3]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};