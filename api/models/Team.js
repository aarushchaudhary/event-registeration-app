const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sapId: { type: String, required: true },
    school: { type: String, required: true },
    course: { type: String, required: true },
    year: { type: Number, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
});

const TeamSchema = new mongoose.Schema({
    teamName: { type: String, required: true, unique: true },
    teamLeaderName: { type: String, required: true },
    teamLeaderPhone: { type: String, required: true },
    members: [MemberSchema],
    status: {
        type: String,
        enum: ['waitlisted', 'approved'],
        default: 'waitlisted'
    },
    registrationDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Team', TeamSchema);