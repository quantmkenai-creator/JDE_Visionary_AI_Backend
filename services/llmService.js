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

// 🔹 CASUAL INPUT DETECTION (enhanced for greetings, smalltalk, random)
function isCasualInput(q) {
  const casualPatterns = [
    /\b(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up|bye|goodbye|thanks|thank you)\b/i,
    /\b(weather|time|date|joke|lorem|test|random|foo|bar)\b/i,
    /^[\s\W]{0,10}$/i,  // Very short or whitespace/nonsense
    /^.{0,20}$/i        // Very short inputs (<20 chars)
  ];
  return casualPatterns.some(pattern => pattern.test(q));
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

  if (q === "hi") {
    return {
      intent: "casual",
      response: "Hey!! I'm JDE Assistant"
    };
  }

  // CASUAL INPUT
  if (isCasualInput(q)) {
    return {
      intent: "casual",
      sql: null,
      response: "Hi! I'm your JDE AI assistant. How can I help with JDE data today? Ask about purchase orders, sales orders, customers, items, or table codes like F4211 (e.g., 'show recent purchase orders' or 'f4211 top 5')."
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

  if (!intent) {
    return {
      intent: "unknown",
      sql: null,
      response: "Sorry, I didn't understand. Try 'purchase orders', 'sales', 'customers', 'items', or table codes (e.g., f4211)."
    };
  }

  const sql = buildQuery(intent, q);

  return { intent, sql };
}

module.exports = { processQuestion };
