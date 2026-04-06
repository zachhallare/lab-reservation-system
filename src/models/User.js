const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['student', 'technician'], default: 'student' },
    description: { type: String, default: '' },
    profilePicture: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
