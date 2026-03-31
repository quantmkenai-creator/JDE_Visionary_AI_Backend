const { CohereClient } = require("cohere-ai");
require("dotenv").config();

const { normalizeQuestion } = require("./schemaMapper");
const { buildQuery } = require("./queryBuilder");

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY
});

// 🔹 TABLE DETECTION
function extractTableName(q) {
  const match = q.match(/\bf\d{4,5}\b/i);
  return match ? match[0].toUpperCase() : null;
}

// 🔹 LIMIT
function detectLimit(q) {
  const m = q.match(/top (\d+)/);
  return m ? parseInt(m[1]) : 100;
}

// 🔹 CHAT DETECTION
function isChat(q) {
  return (
    q.includes("hello") ||
    q.includes("who are you") ||
    q.includes("what is ai") ||
    q.includes("joke") ||
    q.includes("random")
  );
}

// 🔹 AI (fallback)
async function detectIntentAI(q) {
  try {
    const res = await cohere.chat({
      model: "command-r-plus",
      message: `Classify: purchase_order, sales_order, customer, item\nQuery: "${q}"`
    });

    const t = res.text.toLowerCase();

    if (t.includes("purchase")) return "purchase_order";
    if (t.includes("sales")) return "sales_order";
    if (t.includes("customer")) return "customer";
    if (t.includes("item")) return "item";

    return null;
  } catch {
    return null;
  }
}

// 🔥 MAIN
async function processQuestion(question) {
  const q = normalizeQuestion(question);

  // CHAT
  if (isChat(q)) {
    return {
      intent: "chat",
      sql: null,
      message: "I am your JDE AI assistant."
    };
  }

  // TABLE MODE
  const table = extractTableName(q);
  if (table) {
    const limit = detectLimit(q);
    return {
      intent: "table",
      sql: `SELECT TOP ${limit} * FROM dbo.${table}`
    };
  }

  // BUSINESS MODE
  let intent = await detectIntentAI(q);

  if (!intent) {
    if (q.includes("purchase")) intent = "purchase_order";
    else if (q.includes("sales") || q.includes("order"))
      intent = "sales_order";
    else if (q.includes("customer")) intent = "customer";
    else if (q.includes("item")) intent = "item";
  }

  if (!intent) throw new Error("Intent detection failed");

  const sql = buildQuery(intent, q);

  return { intent, sql };
}

module.exports = { processQuestion };