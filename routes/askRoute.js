const express = require("express");
const router = express.Router();

const { processQuestion } = require("../services/llmService");
const { executeQuery } = require("../config/db");

router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({ error: "Please provide a meaningful question (at least 3 characters)." });
    }

    console.log("Question:", question);

    const result = await processQuestion(question);

    console.log("Result:", result);

    if (result.sql) {
      // Business/Table query
      const data = await executeQuery(result.sql);
      res.json({
        question,
        intent: result.intent,
        sql: result.sql,
        data
      });
    } else {
      // Casual/unknown
      res.json({
        question,
        intent: result.intent,
        response: result.response || result.message
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;