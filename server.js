require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const exphbs = require('express-handlebars');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and urlencoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'labubu-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {} // maxAge set dynamically per-login based on rememberMe choice
}));

// Re-extend the 3-week cookie on every visit for users who chose Remember Me
app.use((req, res, next) => {
    if (req.session && req.session.rememberMe) {
        req.session.cookie.maxAge = 21 * 24 * 60 * 60 * 1000;
    }
    next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Configure Handlebars view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src', 'views', 'layouts'),
}));

// Redirect root to login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Import route modules
const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const reservationRoutes = require('./src/routes/reservationRoutes');
const apiRoutes = require('./src/routes/apiRoutes');

// Mount routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', reservationRoutes);
app.use('/api', apiRoutes);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/labubu';
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log(`Connected to MongoDB:`);
        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });
