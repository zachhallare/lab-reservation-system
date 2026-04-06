const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    building: { type: String, required: true },
    floor: { type: String, required: true },
    description: { type: String },
    seats: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Lab', labSchema);
