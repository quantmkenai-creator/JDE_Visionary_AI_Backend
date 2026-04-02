const express = require("express");
const router = express.Router();

const { processQuestion } = require("../services/llmService");
const { executeQuery } = require("../config/db");
const businessMap = require("../utils/businessMap");

// 🔹 Column Remapper for ALL results (Fix raw SHDOCO → order_number)
function mapResults(data, sql) {
  if (!data || data.length === 0) return data;

  // Extract table from SQL: FROM dbo.F4201 → F4201
  const tableMatch = sql.match(/FROM\s+dbo\.([A-Z0-9]+)/i);
  if (!tableMatch) return data;
  
  const rawTable = tableMatch[1];

  // Find businessMap entry (F4201 → sales_order mapping)
  const mapping = Object.values(businessMap).find(m => m.table === rawTable);
  if (!mapping) return data; // Unknown table: keep raw

  const colMap = mapping.columns; // {SHDOCO: "order_number", SHDCTO: "order_type"}

  // Transform each row keys
  return data.map(row => {
    const newRow = {};
    Object.keys(row).forEach(rawCol => {
      // Use friendly name if mapped, else raw
      const friendlyName = colMap[rawCol.toUpperCase()] || rawCol;
      newRow[friendlyName] = row[rawCol];
    });
    return newRow;
  });
}

router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    console.log("Question:", question);

    const { sql, intent } = await processQuestion(question);
    console.log("SQL:", sql);

    let data = await executeQuery(sql);

    // 🔥 Transform ALL results to friendly columns
    data = mapResults(data, sql);
    console.log("Mapped columns:", data[0] ? Object.keys(data[0]) : []);

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
