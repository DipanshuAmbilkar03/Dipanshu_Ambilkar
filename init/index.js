require('dotenv').config();
const mongoose = require("mongoose");
const Project = require("../model/project");

// Connect to the 'pfp' database
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/pfp";

async function main() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to pfp database");
        await seedDB();
    } catch (err) {
        console.log("Connection Error:", err);
    } finally {
        mongoose.connection.close();
    }
}

const initData = [
    {
        title: "WanderLust",
        description: "Built with Node and Express",
        githubLink: "https://github.com/DipanshuAmbilkar03/airbnb",
        liveLink: "airbnb-rho-rouge.vercel.app",
        order: 1,
        technologies: ["Node", "Express", "MongoDB"],
    },
    {
        title: "Breast Cancer Detection Model",
        description: "A Breast Cancer Detection Model is a machine learning–based system designed to predict whether a breast tumor is benign (non-cancerous) or malignant (cancerous) using medical data.",
        githubLink: "https://github.com/DipanshuAmbilkar03/BreastCancerDetectionModel",
        liveLink: "breast-cancer-detection-model.vercel.app",
        order: 4,
        technologies: ['Ensemble Learning (Stacking)', 'Scikit-Learn', 'KNN', 'Decision Trees', 'Logistic Regression', 'Scikit-Learn Pipelines'],
    },
    {
        title: "Recorder",
        description: "Web recorder application deployed on Vercel.",
        githubLink: "https://recoredervercel.vercel.app",
        liveLink: "recoredervercel.vercel.app",
        order: 0,
        technologies: ["JavaScript", "Node.js", "Web Audio"],
    },
    {
        title: "IllGuess",
        description: "Interactive guessing experience deployed on Vercel.",
        githubLink: "https://illguess.vercel.app",
        liveLink: "illguess.vercel.app",
        order: 7,
        technologies: ["JavaScript", "Frontend", "Vercel"],
    },
    {
        title: "Gemini Project",
        description: "Gemini-powered project deployed on Vercel.",
        githubLink: "https://gemini-nu-peach.vercel.app",
        liveLink: "gemini-nu-peach.vercel.app",
        order: 3,
        technologies: ["AI", "JavaScript", "Vercel"],
    },
    {
        title: "Student Performance Model",
        description: "Prediction model for student performance metrics.",
        githubLink: "https://dipu-student-performance-model.vercel.app",
        liveLink: "dipu-student-performance-model.vercel.app",
        order: 4,
        technologies: ["Machine Learning", "Python", "Data Science"],
    },
    {
        title: "BookHub",
        description: "Book discovery and management web application.",
        githubLink: "https://bookhub-alpha-seven.vercel.app",
        liveLink: "bookhub-alpha-seven.vercel.app",
        order: 2,
        technologies: ["MERN", "MongoDB", "Express"],
    },
    {
        title: "Breach Gate",
        description: "Security-focused application deployed on Vercel.",
        githubLink: "https://breach-gate.vercel.app",
        liveLink: "breach-gate.vercel.app",
        order: 6,
        technologies: ["Security", "JavaScript", "Vercel"],
    }
];

const seedDB = async () => {
    await Project.deleteMany({}); 
    await Project.insertMany(initData);
    console.log("Data successfully added to the projects collection!");
};

main();