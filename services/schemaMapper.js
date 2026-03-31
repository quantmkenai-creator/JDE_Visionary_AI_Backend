const synonyms = {
  client: "customer",
  product: "item",
  order: "sales_order",
  orders: "sales_order",
  po: "purchase_order"
};

const statusMap = {
  "in progress": ["220", "230"],
  completed: ["999"]
};

function normalizeQuestion(q) {
  q = q.toLowerCase();
  Object.keys(synonyms).forEach(k => {
    q = q.replaceAll(k, synonyms[k]);
  });
  return q;
}

// 🔹 STATUS
function detectStatus(q) {
  for (let key in statusMap) {
    if (q.includes(key)) return statusMap[key];
  }
  return null;
}

// 🔹 PRIORITY
function detectPriority(q) {
  if (q.includes("high priority")) return "1";
  return null;
}

// 🔹 LIMIT
function detectLimit(q) {
  const m = q.match(/top (\d+)/);
  return m ? parseInt(m[1]) : 100;
}

// 🔹 AGGREGATION
function detectAggregation(q) {
  if (q.includes("total") || q.includes("sum")) return "SUM";
  if (q.includes("count")) return "COUNT";
  return null;
}

// 🔹 CONDITIONS
function detectConditions(q) {
  let conditions = [];

  let qty = q.match(/quantity\s*(is)?\s*(greater than|>|above)\s*(\d+)/);
  if (qty) {
    conditions.push({ field: "quantity", op: ">", value: qty[3] });
  }

  let openQty = q.match(/open quantity\s*(is)?\s*(greater than|>|above)\s*(\d+)/);
  if (openQty) {
    conditions.push({ field: "open_quantity", op: ">", value: openQty[3] });
  }

  return conditions;
}

// 🔥 BUSINESS FLAGS
function detectBusinessFlags(q) {
  return {
    isCritical:
      q.includes("critical") ||
      q.includes("urgent") ||
      q.includes("alert"),

    isDelayed: q.includes("delayed"),
    isPending: q.includes("pending"),

    notCompleted:
      q.includes("not completed") ||
      q.includes("not finished")
  };
}

module.exports = {
  normalizeQuestion,
  detectStatus,
  detectPriority,
  detectLimit,
  detectAggregation,
  detectConditions,
  detectBusinessFlags
};