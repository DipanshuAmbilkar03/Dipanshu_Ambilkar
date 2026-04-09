const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const GalleryImage = require('./model/gallery'); // path to your model

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/pfp';

// Connect to DB
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
    }).then(() => {
    console.log("✅ Connected to MongoDB");
    insertImages();
    }).catch(err => {
    console.error("❌ MongoDB connection error:", err);
});

async function insertImages() {
    const imageDir = path.join(__dirname, './public/image/gallery');

    fs.readdir(imageDir, async (err, files) => {
        if (err) {
        return console.error("❌ Error reading image directory:", err);
        }

        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

        for (const file of imageFiles) {
        try {
            const exists = await GalleryImage.findOne({ filename: file });
            if (!exists) {
            await GalleryImage.create({ filename: file });
            console.log(`📥 Inserted: ${file}`);
            } else {
            console.log(`⚠️ Skipped (already exists): ${file}`);
            }
        } catch (e) {
            console.error(`❌ Error inserting ${file}:`, e);
        }
        }

        console.log("✅ Done inserting images.");
        mongoose.disconnect();
    });
}
