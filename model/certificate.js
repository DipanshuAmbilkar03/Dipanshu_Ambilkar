const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    imagePublicId: { type: String, default: '' },
    imageResourceType: { type: String, default: '' },
    fullImage: { type: String, default: '' },
    fullImagePublicId: { type: String, default: '' },
    fullImageResourceType: { type: String, default: '' },
    issuer: { type: String, default: '' },
    order: { type: Number, default: 999 },
    visible: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

certificateSchema.pre('save', function setUpdatedAt(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
