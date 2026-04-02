const express = require("express");
const router = express.Router();

const { processQuestion } = require("../services/llmService");
const { executeQuery } = require("../config/db");

router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    console.log("Question:", question);

    const { sql, intent } = await processQuestion(question);

    console.log("SQL:", sql);

    const data = await executeQuery(sql);

    res.json({
      question,
      intent,
      sql,
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;