const pool = require("../db");
const axios = require("axios");

exports.login = async (req, res) => {
    const { admission_id, date_of_birth } = req.body;

    try {
        // 1. Check login
        const result = await pool.query(
            "SELECT * FROM students WHERE admission_id = $1 AND date_of_birth = $2",
            [admission_id, date_of_birth]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const student = result.rows[0];

        // 2. Prepare data for ML (only required fields)
        const mlData = {
    attendance: Number(student.attendance),
    marks: Number(student.marks),
    study_hours: Number(student.study_hours),
    distance_from_home: Number(student.distance_from_home),
    annual_income: Number(student.annual_income),
    previous_marks: Number(student.previous_marks),
    backlogs: Number(student.backlogs),
    assignments_completed: Number(student.assignments_completed),
    participation: Number(student.participation)
};

        // 3. Call ML API
        const mlResponse = await axios.post(
            "http://127.0.0.1:5000/predict",
            mlData,
            {
                headers: { "Content-Type": "application/json" }
            }
        );

        // 4. Send combined response
        res.json({
            message: "Login successful",
            student: student,
            prediction: mlResponse.data
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};