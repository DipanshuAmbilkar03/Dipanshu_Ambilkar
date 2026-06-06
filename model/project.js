const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    imagePublicId: { type: String, default: '' },
    imageResourceType: { type: String, default: '' },
    githubLink: { type: String },
    liveLink: { type: String },
    order: { type: Number, default: 999 },
    technologies: [String], 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
