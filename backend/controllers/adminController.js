const db = require("../db");

exports.loginAdmin = async (req, res) => {
  try {
    const { admin_id, password } = req.body;

    const result = await db.query(
      "SELECT * FROM admins WHERE admin_id=$1 AND password=$2",
      [admin_id, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid login" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.addStudent = async (req, res) => {
  try {

    const {
      admission_id,
      name,
      email,
      date_of_birth,
      attendance,
      marks,
      study_hours,
      distance_from_home,
      annual_income,
      previous_marks,
      backlogs,
      assignments_completed,
      participation
    } = req.body;

    const result = await db.query(
      `INSERT INTO students 
      (admission_id, name, email, date_of_birth, attendance, marks, study_hours,
       distance_from_home, annual_income, previous_marks, backlogs,
       assignments_completed, participation)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id`,
      [
        admission_id,
        name,
        email,
        date_of_birth,
        attendance,
        marks,
        study_hours,
        distance_from_home,
        annual_income,
        previous_marks,
        backlogs,
        assignments_completed,
        participation
      ]
    );

    res.json({
      message: "Student added successfully",
      student_id: result.rows[0].id
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error adding student" });
  }
};

exports.assignMentor = async (req, res) => {
  try {

    const { student_id, mentor_id } = req.body;

    await db.query(
      `INSERT INTO mentor_students (mentor_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id)
       DO UPDATE SET mentor_id = EXCLUDED.mentor_id`,
      [mentor_id, student_id]
    );

    res.json({ message: "Mentor assigned successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Assignment error" });
  }
};

exports.getAllStudents = async (req, res) => {
  try {

    const result = await db.query(`
      SELECT 
        s.id,
        s.admission_id,
        s.name,
        s.email,
        m.name AS mentor_name,
        m.mentor_id

      FROM students s
      LEFT JOIN mentor_students ms ON s.id = ms.student_id
      LEFT JOIN mentors m ON ms.mentor_id = m.id
      ORDER BY s.id
    `);

    res.json(result.rows);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Fetch error" });
  }
};

exports.deleteStudent = async (req, res) => {
  try {

    const id = req.params.id;

    await db.query("DELETE FROM mentor_students WHERE student_id=$1", [id]);
    await db.query("DELETE FROM students WHERE id=$1", [id]);

    res.json({ message: "Student removed successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Delete error" });
  }
};


exports.getMentors = async (req, res) => {
  try {

    const result = await db.query(
      "SELECT id, mentor_id, name FROM mentors ORDER BY id"
    );

    res.json(result.rows);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Fetch error" });
  }
};