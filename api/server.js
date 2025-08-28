// =======================================================
//  Imports
// =======================================================
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http'); // Required for Netlify Functions
require('dotenv').config();

// Import Mongoose models
const Team = require('./models/Team');
const Settings = require('./models/Settings');

// =======================================================
//  App Initialization
// =======================================================
const app = express();
const router = express.Router(); // Use an Express router

// =======================================================
//  Middleware
// =======================================================
app.use(cors());
app.use(express.json());
// Note: Serving static files from the function is not standard for Netlify.
// The public folder should be served directly by Netlify's CDN.
// This line can be removed if your netlify.toml is set up correctly, but is harmless.
app.use(express.static(path.join(__dirname, '../public')));

// =======================================================
//  Database Connection
// =======================================================
// It's recommended to connect inside the handler for serverless, but for simplicity, we'll connect once.
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// =======================================================
//  JWT Middleware for Protecting Admin Routes
// =======================================================
const protect = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Token is not valid' });
        }
        req.user = user;
        next();
    });
};

// =======================================================
//  API Routes (defined on the router)
// =======================================================

// --- Public Routes ---
router.get('/stats', async (req, res) => {
    try {
        const settings = await Settings.findOne({ singleton: 'main' }) || { maxTeams: 50, membersPerTeam: 3 };
        const registeredTeamsCount = await Team.countDocuments();
        const seatsEmpty = settings.maxTeams - registeredTeamsCount;

        res.json({
            teamsRegistered: registeredTeamsCount,
            seatsEmpty: seatsEmpty < 0 ? 0 : seatsEmpty,
            totalSeats: settings.maxTeams,
            membersPerTeam: settings.membersPerTeam
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const newTeam = new Team(req.body);
        await newTeam.save();
        res.status(201).json({ message: 'Team registered successfully and is now waitlisted.' });
    } catch (error) {
        res.status(400).json({ message: 'Registration failed. The team name might already be taken.', error: error.message });
    }
});

// --- Admin Routes ---
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token: token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

router.get('/admin/teams', protect, async (req, res) => {
    try {
        const teams = await Team.find().sort({ registrationDate: -1 });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teams' });
    }
});

router.put('/admin/teams/:id/approve', protect, async (req, res) => {
    try {
        const team = await Team.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: 'Error approving team' });
    }
});

router.get('/admin/settings', protect, async (req, res) => {
    try {
        const settings = await Settings.findOne({ singleton: 'main' }) || {};
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

router.put('/admin/settings', protect, async (req, res) => {
    try {
        const { maxTeams, membersPerTeam } = req.body;
        await Settings.findOneAndUpdate({ singleton: 'main' }, { maxTeams, membersPerTeam }, { upsert: true });
        res.json({ success: true, message: 'Settings updated successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// =======================================================
//  Netlify Lambda Setup
// =======================================================
app.use('/.netlify/functions/server', router);  // path must match function name

module.exports.handler = serverless(app);