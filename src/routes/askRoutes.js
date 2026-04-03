import express from "express";
import generateSQL from "../openai/helper.js";
import { getConnection, sql } from "../config/db.js";

const router = express.Router();

router.post("/ask", async (req, res) => {
  const { question } = req.body;
  console.log("question", question);

  if (!question || typeof question !== "string") {
    return res
      .status(400)
      .json({ error: "Question is required and must be a string." });
  }

  try {
    const sqlOrReply = await generateSQL(question);
    console.log("Generated SQL Query:", sqlOrReply);

    // If it's an object, it's a friendly assistant response
    if (typeof sqlOrReply === "object" && sqlOrReply.response) {
      return res.json({ response: sqlOrReply.response });
    }

    // Otherwise, assume it's raw SQL and execute it
    const pool = await getConnection();
    const result = await pool.request().query(sqlOrReply);
    const queryResult = result.recordset;
    return res.json({ result: queryResult });

  } catch (error) {
    console.error("Error processing request:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing the query." });
  }
});

export default router;
