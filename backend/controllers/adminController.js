const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios (para la tabla del panel)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Seguridad: nunca enviar hashes al panel
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// Cambiar rol (Asignación/Quita de permisos)
exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.status(200).json({ message: `Rol actualizado a ${role} para ${user.username}` });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar permisos' });
    }
};

// Resetear contraseña (Generación de nueva clave)
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // El middleware pre-save de User.js se encargará de hashear esto automáticamente
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Contraseña reseteada con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al resetear contraseña' });
    }
};

// Baja de usuario (Eliminar cuenta)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.status(200).json({ message: 'Usuario dado de baja correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
};