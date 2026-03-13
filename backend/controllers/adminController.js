const User = require('../models/User');

/**
 * CONTROLADOR DE ADMINISTRACIÓN AE
 * Seguridad Crítica: Gestión de personal y acceso.
 */

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
    try {
        // Seleccionamos todo menos el password por seguridad
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        // Enviamos la respuesta envuelta en un objeto para compatibilidad con Axios en el Frontend
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('❌ Error en getAllUsers:', error);
        res.status(500).json({ success: false, message: 'Error al obtener lista de personal' });
    }
};

// Cambiar rol (Asignación/Quita de permisos)
exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        
        // Validamos que el rol sea uno de los permitidos por el sistema
        const rolesValidos = ['user', 'boss', 'admin'];
        if (!rolesValidos.includes(role)) {
            return res.status(400).json({ message: 'Rango/Rol no válido' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        
        res.status(200).json({ 
            success: true,
            message: `Permisos actualizados: ${user.username} ahora es ${role}`,
            data: user 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar permisos' });
    }
};

// Resetear contraseña (Generación de nueva clave)
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'La nueva clave debe tener al menos 6 caracteres' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // IMPORTANTE: Al asignar directamente, el middleware 'pre-save' de User.js 
        // detectará que el campo password fue modificado y lo hasheará automáticamente.
        user.password = newPassword;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Contraseña de ${user.username} reseteada correctamente` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al resetear contraseña' });
    }
};

// Baja de usuario (Eliminar cuenta)
exports.deleteUser = async (req, res) => {
    try {
        // Evitar que un admin se borre a sí mismo accidentalmente
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'No puede darse de baja a sí mismo.' });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        
        res.status(200).json({ 
            success: true, 
            message: 'Personal dado de baja del sistema correctamente' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
};