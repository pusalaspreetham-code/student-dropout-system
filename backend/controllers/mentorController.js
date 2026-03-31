const db = require("../db");
const axios = require("axios");

// ✅ Mentor Login
exports.loginMentor = async (req, res) => {
  const { mentor_id, password } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM mentors WHERE mentor_id = $1 AND password = $2",
      [mentor_id, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid login" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


// ✅ Get Mentor Students + ML Prediction
exports.getMentorStudents = async (req, res) => {
  const mentorId = req.params.id;

  try {
    const result = await db.query(
      `
      SELECT s.*
      FROM mentor_students ms
      JOIN students s ON ms.student_id = s.id
      JOIN mentors m ON ms.mentor_id = m.id
      WHERE m.mentor_id = $1
      `,
      [mentorId]
    );

    const students = result.rows;
    const finalData = [];

    for (let s of students) {

      const mlData = {
        attendance: Number(s.attendance),
        marks: Number(s.marks),
        study_hours: Number(s.study_hours),
        distance_from_home: Number(s.distance_from_home),
        annual_income: Number(s.annual_income),
        previous_marks: Number(s.previous_marks),
        backlogs: Number(s.backlogs),
        assignments_completed: Number(s.assignments_completed),
        participation: Number(s.participation)
      };

      try {
        const mlRes = await axios.post(
          "http://127.0.0.1:5000/predict",
          mlData
        );

        finalData.push({
          ...s,
          prediction: mlRes.data.prediction,
          risk_percent: mlRes.data.risk_percent,
          risk_level: mlRes.data.risk_level
        });

      } catch (err) {
        console.error("ML Error:", err.message);

        finalData.push({
          ...s,
          prediction: null,
          risk_percent: 0,
          risk_level: "ERROR"
        });
      }
    }

    res.json(finalData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};