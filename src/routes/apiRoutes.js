const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Lab = require('../models/Lab');
const Reservation = require('../models/Reservation');

// ===== READ endpoints =====
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-_id -__v').lean();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching users' });
    }
});

router.get('/labs', async (req, res) => {
    try {
        const labs = await Lab.find({}, '-_id -__v').lean();
        res.json(labs);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching labs' });
    }
});

router.get('/reservations', async (req, res) => {
    try {
        const reservations = await Reservation.find({}, '-_id -__v').lean();
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching reservations' });
    }
});

// ===== SESSION / AUTH =====
router.get('/session', async (req, res) => {
    if (req.session && req.session.userId) {
        const user = await User.findOne({ id: req.session.userId }, '-_id -__v').lean();
        if (user) {
            return res.json({ loggedIn: true, user });
        }
    }
    res.json({ loggedIn: false });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }, '-_id -__v').lean();
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        
        req.session.userId = user.id;
        res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
        return res.status(400).json({ error: 'First name is required' });
    }
    if (!lastName || typeof lastName !== 'string' || lastName.trim() === '') {
        return res.status(400).json({ error: 'Last name is required' });
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (!email.endsWith('@dlsu.edu.ph')) {
        return res.status(400).json({ error: 'Email must end with @dlsu.edu.ph' });
    }
    if (!password || typeof password !== 'string' || password.trim() === '') {
        return res.status(400).json({ error: 'Password is required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    try {
        // Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }
        // Get next id
        const maxUser = await User.findOne().sort({ id: -1 }).lean();
        const newId = maxUser ? maxUser.id + 1 : 1;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            id: newId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'student',
            description: ''
        });
        const userObj = newUser.toObject();
        delete userObj._id;
        delete userObj.__v;
        delete userObj.password;
        res.json({ success: true, user: userObj });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== USER CRUD =====
router.put('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { firstName, lastName, description, profilePicture, role } = req.body;

    if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim() === '')) {
        return res.status(400).json({ error: 'First name cannot be empty' });
    }
    if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim() === '')) {
        return res.status(400).json({ error: 'Last name cannot be empty' });
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
        return res.status(400).json({ error: 'Description is invalid or too long' });
    }
    if (role !== undefined && !['student', 'technician'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        const update = {};
        if (firstName !== undefined) update.firstName = firstName;
        if (lastName !== undefined) update.lastName = lastName;
        if (description !== undefined) update.description = description;
        if (profilePicture !== undefined) update.profilePicture = profilePicture;
        if (role !== undefined) update.role = role;

        await User.updateOne({ id: userId }, { $set: update });
        const user = await User.findOne({ id: userId }, '-_id -__v').lean();
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        await User.deleteOne({ id: userId });
        await Reservation.deleteMany({ userId });
        req.session.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/users/promote', async (req, res) => {
    const { studentEmail, technicianPassword } = req.body;
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const techUser = await User.findOne({ id: req.session.userId }).lean();
        if (!techUser || techUser.role !== 'technician') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const isMatch = await bcrypt.compare(technicianPassword, techUser.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        const student = await User.findOne({ email: studentEmail });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        if (student.role === 'technician') {
            return res.status(400).json({ error: 'User is already a technician' });
        }
        
        await User.updateOne({ id: student.id }, { $set: { role: 'technician' } });
        res.json({ success: true, message: 'Student promoted to technician successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error promoting user' });
    }
});

// ===== RESERVATION CRUD =====
router.post('/reservations', async (req, res) => {
    try {
        const reservations = req.body; // array of reservation objects
        const arr = Array.isArray(reservations) ? reservations : [reservations];
        
        const today = new Date().toISOString().split('T')[0];
        if (arr.some(r => r.date < today)) {
            return res.status(400).json({ error: 'Cannot reserve past dates' });
        }

        await Reservation.insertMany(arr);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error creating reservations' });
    }
});

router.put('/reservations/:id', async (req, res) => {
    const resId = parseInt(req.params.id);
    try {
        const today = new Date().toISOString().split('T')[0];
        if (req.body.date && req.body.date < today) {
            return res.status(400).json({ error: 'Cannot reserve past dates' });
        }

        // Strip out user ids to prevent swapping reservation ownership
        delete req.body.userId;
        delete req.body.studentId;

        await Reservation.updateOne({ id: resId }, { $set: req.body });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error updating reservation' });
    }
});

router.delete('/reservations/:id', async (req, res) => {
    const resId = parseInt(req.params.id);
    try {
        const reservation = await Reservation.findOne({ id: resId }).lean();
        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        const now = new Date();
        const resDate = new Date(`${reservation.date}T${reservation.time}`);
        const diffMins = (now - resDate) / (1000 * 60);

        if (!reservation.isBlocked && diffMins < 10) {
            return res.status(403).json({ error: 'Cannot delete reservation until 10 minutes after start time' });
        }

        await Reservation.deleteOne({ id: resId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error deleting reservation' });
    }
});

// Bulk delete (for group cancellation)
router.post('/reservations/delete-bulk', async (req, res) => {
    const { ids } = req.body; // array of ids
    try {
        await Reservation.deleteMany({ id: { $in: ids } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error deleting reservations' });
    }
});

// Toggle anonymous for a group
router.post('/reservations/toggle-anonymous', async (req, res) => {
    const { ids, anonymous } = req.body;
    try {
        await Reservation.updateMany({ id: { $in: ids } }, { $set: { anonymous } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
