const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // Using a fixed ID to ensure there's only one settings document
    singleton: { type: String, default: 'main', unique: true },
    maxTeams: { type: Number, default: 50 },
    membersPerTeam: { type: Number, default: 3 },
    paymentRequired: { type: Boolean, default: true },
    registrationsOpen: { type: Boolean, default: true },
    paymentAmount: { type: Number, default: null },
    upiId: { type: String, default: null }
});

module.exports = mongoose.model('Settings', SettingsSchema);