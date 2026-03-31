const pool = require("../db");
const { GoogleGenerativeAI } = require("@google/generative-ai");


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getChatResponse = async (req, res) => {
    // 1. Destructure the new ML data sent from the dashboard
    const { admission_id, message, risk_percent, risk_level } = req.body;

    console.log(`Chat request received for: ${admission_id} | Risk: ${risk_percent}%`);

    if (!admission_id || !message) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // 2. Fetch the student's personal data
        const result = await pool.query(
            "SELECT * FROM students WHERE admission_id = $1",
            [admission_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        const s = result.rows[0];

        // 3. Updated System Prompt including ML Prediction context
        const systemPrompt = `
    You are a professional Academic Success Counselor . 
    Your goal is to help ${s.name} stay on track and graduate.

    IMPORTANT - ML PREDICTION DATA:
    - AI-Calculated Dropout Risk: ${Number(risk_percent).toFixed(2)}%
    - Risk Category: ${risk_level}

    STUDENT METRICS:
    - Attendance: ${Number(s.attendance).toFixed(2)}%
    - Current Marks: ${s.marks}/100
    - Backlogs: ${s.backlogs}
    - Study Hours: ${s.study_hours} hrs/day
    - Participation: ${s.participation}/5

    STRATEGY:
    1. If Risk is "High" (${risk_percent}% > 70%), be supportive but highlight that their current metrics need urgent attention.
    2. If Attendance is below 75%, emphasize that they might be barred from exams.
    3. Use the specific stats to explain the risk. For example: "With ${s.backlogs} backlogs, your risk level is at ${risk_percent}%. Let's create a plan."
    4. If annual income is low (${s.annual_income}), mention the college's financial aid office.

    TONE: 
    - Encouraging, professional, and data-driven.
    - Do not say "The data says." Speak directly to ${s.name}.
    INSTRUCTIONS: Keep your response clean. Do not use excessive symbols or bold asterisks in the middle of sentences.
    `;

        // 4. Using the model that works for your environment
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Understood. I have analyzed " + s.name + "'s risk assessment and metrics. I'm ready to counsel them." }] },
            ],
        });

        const resultAI = await chat.sendMessage(message);
        const responseText = resultAI.response.text();

        res.json({ reply: responseText });

    } catch (err) {
        console.error("Chatbot Error:", err);
        res.status(500).send("Chatbot error");
    }
};