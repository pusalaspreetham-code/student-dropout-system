const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

// ✅ THIS MUST EXIST
router.post("/login", adminController.loginAdmin);

router.post("/student", adminController.addStudent);
router.post("/assign-mentor", adminController.assignMentor);

router.get("/students", adminController.getAllStudents);
router.get("/mentors", adminController.getMentors);

router.delete("/student/:id", adminController.deleteStudent);

module.exports = router;