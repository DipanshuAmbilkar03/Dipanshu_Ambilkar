const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    imagePublicId: {
        type: String,
        default: ''
    },
    imageResourceType: {
        type: String,
        default: ''
    },
    caption: {
        type: String,
        default: ''
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('galleryImages',galleryImageSchema);
