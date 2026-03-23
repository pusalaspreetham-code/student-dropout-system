const express = require("express");
const cors = require("cors");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const predictRoutes = require("./routes/predict");
const app = express();




app.use(cors());
app.use(express.json());

// 🔥 TEST ROUTE (keep for debugging)
app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM students LIMIT 5");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});

// 🔥 LOGIN ROUTES
app.use("/api", authRoutes);
app.use("/api", predictRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});