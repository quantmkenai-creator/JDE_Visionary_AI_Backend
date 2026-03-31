function buildPrompt(question) {
  return `
Classify the user query into one of these intents:

- purchase_order
- sales_order
- customer
- item

Examples:
"show purchase orders" → purchase_order
"list customers" → customer
"get items" → item

Only return ONE word.

Query: "${question}"
`;
}

module.exports = { buildPrompt };