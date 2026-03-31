const express = require("express");
const router = express.Router();

const mentorController = require("../controllers/mentorController");

router.post("/login", mentorController.loginMentor);

router.get("/students/:id", mentorController.getMentorStudents);

module.exports = router;