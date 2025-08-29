const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // This field will store the only valid token for the user
    activeSessionToken: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Admin', AdminSchema);