const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    groupId: { type: Number },
    labId: { type: Number, required: true },
    seatNumber: { type: Number, required: true },
    userId: { type: Number, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    anonymous: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isWalkIn: { type: Boolean, default: false },
    requestedAt: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
