const express = require('express');
const router = express.Router();
const GalleryImage = require('../models/GalleryImage');

// Route to fetch all gallery images
router.get('/gallery', async (req, res) => {
    try {
        const images = await GalleryImage.find().sort({ uploadedAt: -1 });
        res.render('gallery', { images }); // Assumes you have gallery.ejs or similar view
    } catch (error) {
        res.status(500).send('Error loading gallery');
    }
});

module.exports = router;
