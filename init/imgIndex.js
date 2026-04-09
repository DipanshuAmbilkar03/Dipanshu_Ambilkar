const mongoose = require("mongoose");
const img = require("../model/img.js");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/pfp";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}