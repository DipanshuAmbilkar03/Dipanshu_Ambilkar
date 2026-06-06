const mongoose = require('mongoose');

const skillGroupSchema = new mongoose.Schema({
    title: { type: String, required: true },
    skills: [{ type: String }],
}, { _id: false });

const resumeItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    organization: { type: String, default: '' },
    period: { type: String, default: '' },
    description: { type: String, default: '' },
}, { _id: false });

const siteContentSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'main' },
    heroRoles: { type: String, default: '' },
    heroLead: { type: String, default: '' },
    resumeSummary: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },
    resumeFileName: { type: String, default: '' },
    resumeOriginalName: { type: String, default: '' },
    resumePublicId: { type: String, default: '' },
    resumeResourceType: { type: String, default: '' },
    resumeUploadedAt: { type: Date, default: null },
    skillGroups: [skillGroupSchema],
    resumeItems: [resumeItemSchema],
    updatedAt: { type: Date, default: Date.now },
});

siteContentSchema.pre('save', function setUpdatedAt(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('SiteContent', siteContentSchema);
