// =======================================================
//  Imports
// =======================================================
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Loads environment variables from a .env file

// Import Mongoose models
const Team = require('./models/Team');
const Settings = require('./models/Settings');

// =======================================================
//  App Initialization & Middleware
// =======================================================
const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Allow the server to accept JSON in request bodies
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files correctly

// =======================================================
//  Database Connection
// =======================================================
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
//  Public API Routes
// =======================================================

// GET endpoint to provide stats and settings for the homepage
app.get('/api/stats', async (req, res) => {
    try {
        const settings = await Settings.findOne({ singleton: 'main' }) || { maxTeams: 50, membersPerTeam: 3 };
        const registeredTeamsCount = await Team.countDocuments();
        const seatsEmpty = settings.maxTeams - registeredTeamsCount;

        res.json({
            teamsRegistered: registeredTeamsCount,
            seatsEmpty: seatsEmpty < 0 ? 0 : seatsEmpty,
            totalSeats: settings.maxTeams,
            membersPerTeam: settings.membersPerTeam // This provides the team size to the frontend
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
});

// POST endpoint for new team registrations
app.post('/api/register', async (req, res) => {
    try {
        const newTeam = new Team(req.body);
        await newTeam.save();
        res.status(201).json({ message: 'Team registered successfully and is now waitlisted.' });
    } catch (error) {
        res.status(400).json({ message: 'Registration failed. The team name might already be taken.', error: error.message });
    }
});

// =======================================================
//  Admin API Routes
// =======================================================

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // --- TEMPORARY DEBUGGING CODE ---
    console.log('--- LOGIN ATTEMPT ---');
    console.log('Data from form (Username):', username);
    console.log('Data from form (Password):', password);
    console.log('Variable on Server (ADMIN_USER):', process.env.ADMIN_USER);
    console.log('Variable on Server (ADMIN_PASS):', process.env.ADMIN_PASS);
    // --- END DEBUG ---
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token: token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/admin/teams', protect, async (req, res) => {
    try {
        const teams = await Team.find().sort({ registrationDate: -1 });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teams' });
    }
});

app.put('/api/admin/teams/:id/approve', protect, async (req, res) => {
    try {
        const team = await Team.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: 'Error approving team' });
    }
});

app.get('/api/admin/settings', protect, async (req, res) => {
    try {
        const settings = await Settings.findOne({ singleton: 'main' }) || {};
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

app.put('/api/admin/settings', protect, async (req, res) => {
    try {
        const { maxTeams, membersPerTeam } = req.body;
        await Settings.findOneAndUpdate({ singleton: 'main' }, { maxTeams, membersPerTeam }, { upsert: true });
        res.json({ success: true, message: 'Settings updated successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// =======================================================
//  Start Server
// =======================================================
app.listen(port, () => {
    console.log(`🚀 Server is running and listening on http://localhost:${port}`);
});