const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const imgSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: true, 
        default: Date.now,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    author: {
        name: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
})

const img = mongoose.model("Image",imgSchema);

module.exports = img;