require('dotenv').config();
console.log("Check API Key:", process.env.GEMINI_API_KEY ? "Key Found ✅" : "Key Not Found ❌");

const express = require("express");
const cors = require("cors");
const pool = require("./db");

// ROUTES
const authRoutes = require("./routes/auth");              // student
const mentorRoutes = require("./routes/mentorRoutes");    // mentor
const adminRoutes = require("./routes/adminRoutes");      // admin
const predictRoutes = require("./routes/predict");        // ML
const chatController = require("./controllers/chatController");

const app = express();

app.use(cors());
app.use(express.json());


app.post("/api/chat", chatController.getChatResponse);

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students LIMIT 5");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});


app.use("/api", authRoutes);
app.use("/api/mentor", mentorRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api", predictRoutes);


app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});