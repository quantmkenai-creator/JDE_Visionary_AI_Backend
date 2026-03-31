// services/queryBuilder.js

const {
  detectStatus,
  detectPriority,
  detectAggregation,
  detectLimit,
  detectConditions,
  detectBusinessFlags
} = require("./schemaMapper");

function buildQuery(intent, question) {

  // 🔥 ================= SMART / EXECUTIVE QUESTIONS =================

  // 1️⃣ Critical alerts today
  if (
    question.includes("critical alerts") ||
    (question.includes("critical") && question.includes("today"))
  ) {
    return `
      SELECT TOP 10 *
      FROM dbo.F4211 SD
      WHERE SD.SDPRIO = '1'
      ORDER BY SD.SDDRQJ DESC
    `;
  }

  // 2️⃣ Stockout risk
  if (
    question.includes("stockout") ||
    question.includes("risk of stockout")
  ) {
    return `
      SELECT TOP 20 
        I.IMITM AS item_number,
        I.IMDSC1 AS description,
        S.LIPQOH AS quantity_on_hand
      FROM dbo.F4101 I
      JOIN dbo.F41021 S ON I.IMITM = S.LIITM
      WHERE S.LIPQOH < 50
      ORDER BY S.LIPQOH ASC
    `;
  }

  // 3️⃣ Delayed purchase orders (risk)
  if (
    question.includes("delayed purchase") ||
    question.includes("delay probability")
  ) {
    return `
      SELECT TOP 20 *
      FROM dbo.F4311 PD
      WHERE PD.PDNXTR IN ('230')
        AND PD.PDUOPN > 0
      ORDER BY PD.PDDJ DESC
    `;
  }

  // 4️⃣ High priority order status
  if (
    question.includes("high priority") &&
    question.includes("status")
  ) {
    return `
      SELECT TOP 20 
        SD.SDDOCO AS order_number,
        SD.SDNXTR AS status,
        SD.SDPRIO AS priority
      FROM dbo.F4211 SD
      WHERE SD.SDPRIO = '1'
      ORDER BY SD.SDNXTR
    `;
  }

  // ================= NORMAL QUERY ENGINE =================

  const status = detectStatus(question);
  const priority = detectPriority(question);
  const aggregation = detectAggregation(question);
  const limit = detectLimit(question);
  const conditions = detectConditions(question);
  const flags = detectBusinessFlags(question);

  let where = [];
  let groupBy = "";
  let orderBy = "";

  // 🔹 STATUS
  if (status) {
    const s = status.map(v => `'${v}'`).join(",");
    if (intent === "purchase_order") {
      where.push(`PD.PDNXTR IN (${s})`);
    } else {
      where.push(`SD.SDNXTR IN (${s})`);
    }
  }

  // 🔹 PRIORITY
  if (priority) {
    where.push(`SD.SDPRIO = '${priority}'`);
  }

  // 🔥 CRITICAL / URGENT / ALERT
  if (flags.isCritical) {
    where.push(`SD.SDPRIO = '1'`);
  }

  // 🔥 DELAYED
  if (flags.isDelayed) {
    where.push(`SD.SDNXTR IN ('230')`);
  }

  // 🔥 PENDING
  if (flags.isPending) {
    where.push(`SD.SDNXTR IN ('220')`);
  }

  // 🔥 NOT COMPLETED
  if (flags.notCompleted) {
    where.push(`SD.SDNXTR NOT IN ('999')`);
  }

  // 🔹 CONDITIONS
  conditions.forEach(c => {
    if (c.field === "quantity") {
      where.push(`SD.SDUORG ${c.op} ${c.value}`);
    }
    if (c.field === "open_quantity") {
      where.push(`PD.PDUOPN ${c.op} ${c.value}`);
    }
  });

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // 🔹 ORDER BY
  if (question.includes("recent") || question.includes("latest")) {
    orderBy = "ORDER BY SD.SDDRQJ DESC";
  }

  if (question.includes("highest quantity")) {
    orderBy = "ORDER BY SD.SDUORG DESC";
  }

  // 🔹 GROUP BY
  if (
    question.includes("per customer") ||
    question.includes("grouped by customer")
  ) {
    groupBy = "GROUP BY SO.SHAN8";
  }

  // ================= SALES =================
  if (intent === "sales_order") {

    // 🔹 AGGREGATION
    if (aggregation === "SUM") {

      if (question.includes("amount")) {
        return `
          SELECT SUM(SD.SDUORG * SD.SDUPRC) AS total_sales_amount
          FROM dbo.F4211 SD
          ${whereSQL}
        `;
      }

      if (groupBy) {
        return `
          SELECT SO.SHAN8, SUM(SD.SDUORG) AS total_quantity
          FROM dbo.F4201 SO
          JOIN dbo.F4211 SD ON SO.SHDOCO = SD.SDDOCO
          ${whereSQL}
          ${groupBy}
        `;
      }

      return `
        SELECT SUM(SD.SDUORG) AS total_sales_quantity
        FROM dbo.F4211 SD
        ${whereSQL}
      `;
    }

    // 🔹 COUNT
    if (aggregation === "COUNT") {
      return `
        SELECT COUNT(*) AS total_orders
        FROM dbo.F4211 SD
        ${whereSQL}
      `;
    }

    // 🔹 JOIN CUSTOMER
    if (
      question.includes("customer name") ||
      question.includes("customer details")
    ) {
      return `
        SELECT TOP ${limit} C.ABALPH, SD.*
        FROM dbo.F4201 SO
        JOIN dbo.F4211 SD ON SO.SHDOCO = SD.SDDOCO
        JOIN dbo.F0101 C ON SO.SHAN8 = C.ABAN8
        ${whereSQL}
        ${orderBy}
      `;
    }

    // 🔹 DEFAULT SALES
    return `
      SELECT TOP ${limit} *
      FROM dbo.F4201 SO
      JOIN dbo.F4211 SD ON SO.SHDOCO = SD.SDDOCO
      ${whereSQL}
      ${orderBy}
    `;
  }

  // ================= PURCHASE =================
  if (intent === "purchase_order") {

    if (aggregation === "SUM") {
      return `
        SELECT SUM(PD.PDUORG) AS total_purchase_quantity
        FROM dbo.F4311 PD
        ${whereSQL}
      `;
    }

    return `
      SELECT TOP ${limit} *
      FROM dbo.F4301 PO
      JOIN dbo.F4311 PD ON PO.PHDOCO = PD.PDDOCO
      ${whereSQL}
    `;
  }

  // ================= CUSTOMER =================
  if (intent === "customer") {
    return `SELECT TOP ${limit} * FROM dbo.F0101`;
  }

  // ================= ITEM =================
  if (intent === "item") {
    return `
      SELECT TOP ${limit} I.*, S.LIPQOH
      FROM dbo.F4101 I
      LEFT JOIN dbo.F41021 S ON I.IMITM = S.LIITM
    `;
  }

  return null;
}

module.exports = { buildQuery };