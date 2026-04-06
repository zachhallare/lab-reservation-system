require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const Lab = require('./src/models/Lab');
const Reservation = require('./src/models/Reservation');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/labubu';
mongoose.connect(MONGODB_URI)
    .then(() => console.log(`Connected to MongoDB for seeding.`))
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });

const seedData = async () => {
    try {
        await User.deleteMany({});
        await Lab.deleteMany({});
        await Reservation.deleteMany({});

        const saltRounds = 10;
        const users = await User.insertMany([
            { id: 1, email: 'student@dlsu.edu.ph', password: await bcrypt.hash('password123', saltRounds), firstName: 'Juan', lastName: 'Dela Cruz', role: 'student', description: 'Generic Student' },
            { id: 2, email: 'keifer_sy@dlsu.edu.ph', password: await bcrypt.hash('keifer', saltRounds), firstName: 'Keifer', lastName: 'Sy', role: 'technician', description: 'CS-ST Student' },
            { id: 3, email: 'ralph_andrei_delrosario@dlsu.edu.ph', password: await bcrypt.hash('ralph', saltRounds), firstName: 'Ralph', lastName: 'Del Rosario', role: 'student', description: 'CS-ST Student' },
            { id: 4, email: 'farrell_tadina@dlsu.edu.ph', password: await bcrypt.hash('farrell', saltRounds), firstName: 'Farrell', lastName: 'Tadina', role: 'student', description: 'CS-ST Student' },
            { id: 5, email: 'zach_benedict_hallare@dlsu.edu.ph', password: await bcrypt.hash('zach', saltRounds), firstName: 'Zach', lastName: 'Hallare', role: 'technician', description: 'CS-NIS Student' },
        ]);

        const labs = await Lab.insertMany([
            { id: 1, name: 'Computer Lab G302', building: 'Gokongwei', floor: '3rd Floor', seats: 30, description: 'General purpose lab with Windows PCs' },
            { id: 2, name: 'Computer Lab G304', building: 'Gokongwei', floor: '3rd Floor', seats: 25, description: 'Programming lab with dual monitors' },
            { id: 3, name: 'Computer Lab V201', building: 'Velasco', floor: '2nd Floor', seats: 20, description: 'Mac lab for design courses' },
            { id: 4, name: 'Computer Lab A101', building: 'Andrew', floor: '1st Floor', seats: 35, description: 'Large lecture lab' },
            { id: 5, name: 'Computer Lab Y606', building: 'Yuchengco', floor: '6th Floor', seats: 40, description: 'Largest lecture lab' },
        ]);

        // Generate some sample reservations
        const today = new Date();
        const reservations = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + Math.floor(Math.random() * 7));
            const dateStr = date.toISOString().split('T')[0];
            const hour = 7 + Math.floor(Math.random() * 14);
            const minute = Math.random() > 0.5 ? '00' : '30';
            const time = `${hour.toString().padStart(2, '0')}:${minute}`;

            reservations.push({
                id: i + 1,
                labId: Math.floor(Math.random() * 5) + 1,
                seatNumber: Math.floor(Math.random() * 20) + 1,
                userId: Math.floor(Math.random() * 5) + 1,
                date: dateStr,
                time: time,
                anonymous: Math.random() > 0.7,
                isBlocked: false,
                isWalkIn: false,
                requestedAt: new Date().toISOString(),
            });
        }
        await Reservation.insertMany(reservations);

        console.log(`Seeding successful: ${users.length} Users, ${labs.length} Labs, ${reservations.length} Reservations created.`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
};

seedData();
