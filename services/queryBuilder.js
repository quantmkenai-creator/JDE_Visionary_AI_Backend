// services/queryBuilder.js

const {
  detectAggregation,
  detectLimit,
  detectConditions,
  detectBusinessFlags
} = require("./schemaMapper");

const businessMap = require("../utils/businessMap");

// 🔥 STATUS CODES
const SALES_IN_PROGRESS = ['520','540','560','573','578'];
const PURCHASE_IN_PROGRESS = ['220','230','240','250','280','380'];

function buildQuery(intent, question) {

  question = question.toLowerCase();

  const limit = detectLimit(question);
  const aggregation = detectAggregation(question);
  const conditions = detectConditions(question);
  const flags = detectBusinessFlags(question);

  let where = [];
  let orderBy = "";

  // =====================================================
  // 🔥 GENERIC: ALL ORDERS IN PROGRESS (FIXED)
  // =====================================================
  if (
    question.includes("orders in progress") ||
    question.includes("all orders in progress")
  ) {
    return `
      SELECT TOP 100 *
      FROM dbo.F4211 SD
      WHERE SD.SDNXTR IN (${SALES_IN_PROGRESS.map(c => `'${c}'`).join(",")})

      UNION

      SELECT TOP 100 *
      FROM dbo.F4311 PD
      WHERE PD.PDNXTR IN (${PURCHASE_IN_PROGRESS.map(c => `'${c}'`).join(",")})
    `;
  }

  // =====================================================
  // 🔥 SALES ORDER
  // =====================================================
  if (intent === "sales_order") {

    const SO = businessMap.sales_order;
    const SD = businessMap.sales_order_detail;
    const C = businessMap.customer;

    // 🔥 PRIORITY
    if (question.includes("high priority") || question.includes("urgent") || flags.isCritical) {
      where.push(`SD.${SD.columns.SDPRIO} = 'HIGH'`);
    }

    // 🔥 IN PROGRESS
    if (question.includes("in progress")) {
      where.push(`SD.${SD.columns.SDNXTR} IN (${SALES_IN_PROGRESS.map(c => `'${c}'`).join(",")})`);
    }

    // 🔥 DELAYED
    if (flags.isDelayed) {
      where.push(`SD.${SD.columns.SDNXTR} IN ('230')`);
    }

    // 🔥 NOT COMPLETED
    if (flags.notCompleted) {
      where.push(`SD.${SD.columns.SDNXTR} NOT IN ('999')`);
    }

    // 🔥 CONDITIONS
    conditions.forEach(c => {
      if (c.field === "quantity") {
        where.push(`SD.${SD.columns.SDUORG} ${c.op} ${c.value}`);
      }
    });

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // 🔥 ORDER
    if (question.includes("recent")) {
      orderBy = `ORDER BY SD.${SD.columns.SDDRQJ} DESC`;
    }

    // =====================================================
    // 🔥 AGGREGATION (FINAL FIXED VERSION)
    // =====================================================
    if (aggregation === "SUM") {

      // ✅ TOTAL SALES PER CUSTOMER (FIXED)
      if (question.includes("per customer") ||
          question.includes("grouped by customer") ||
          question.includes("group by customer")
        ) {
        return `
          SELECT 
            C.${C.columns.ABALPH} AS customer_name,
            SUM(SD.${SD.columns.SDUORG}) AS total_quantity
          FROM dbo.${SO.table} SO
          JOIN dbo.${SD.table} SD
            ON SO.${SO.columns.SHDOCO} = SD.${SD.columns.SDDOCO}
          JOIN dbo.${C.table} C
            ON SO.${SO.columns.SHAN8} = C.${C.columns.ABAN8}
          ${whereSQL}
          GROUP BY C.${C.columns.ABALPH}
          ${orderBy}
        `;
      }

      // ✅ SALES AMOUNT
      if (
        question.includes("amount") ||
        question.includes("revenue") ||
        question.includes("value")
      ) {
        return `
          SELECT SUM(
            SD.${SD.columns.SDUORG} * SD.${SD.columns.SDUPRC}
          ) AS total_sales_amount
          FROM dbo.${SD.table} SD
          ${whereSQL}
        `;
      }

      // ✅ DEFAULT
      return `
        SELECT SUM(SD.${SD.columns.SDUORG}) AS total_quantity
        FROM dbo.${SD.table} SD
        ${whereSQL}
      `;
    }

    // 🔥 COUNT
    if (aggregation === "COUNT") {
      return `
        SELECT COUNT(*) AS total_orders
        FROM dbo.${SD.table} SD
        ${whereSQL}
      `;
    }

    // 🔥 JOIN CUSTOMER
    if (question.includes("customer")) {
      return `
        SELECT TOP ${limit}
          C.${C.columns.ABALPH} AS customer_name,
          SD.*
        FROM dbo.${SO.table} SO
        JOIN dbo.${SD.table} SD
          ON SO.${SO.columns.SHDOCO} = SD.${SD.columns.SDDOCO}
        JOIN dbo.${C.table} C
          ON SO.${SO.columns.SHAN8} = C.${C.columns.ABAN8}
        ${whereSQL}
        ${orderBy}
      `;
    }

    return `
      SELECT TOP ${limit} *
      FROM dbo.${SO.table} SO
      JOIN dbo.${SD.table} SD
        ON SO.${SO.columns.SHDOCO} = SD.${SD.columns.SDDOCO}
      ${whereSQL}
      ${orderBy}
    `;
  }

  // =====================================================
  // 🔥 PURCHASE ORDER
  // =====================================================
  if (intent === "purchase_order") {

    const PO = businessMap.purchase_order;
    const PD = businessMap.purchase_order_detail;

    // 🔥 IN PROGRESS
    if (question.includes("in progress")) {
      where.push(`PD.${PD.columns.PDNXTR} IN (${PURCHASE_IN_PROGRESS.map(c => `'${c}'`).join(",")})`);
    }

    // 🔥 CRITICAL
    if (flags.isCritical) {
      where.push(`PD.${PD.columns.PDNXTR} IN ('220','230')`);
    }

    // 🔥 DELAYED
    if (flags.isDelayed) {
      where.push(`PD.${PD.columns.PDNXTR} IN ('230')`);
      where.push(`PD.${PD.columns.PDUOPN} > 0`);
    }

    // 🔥 PENDING
    if (flags.isPending) {
      where.push(`PD.${PD.columns.PDNXTR} IN ('100','120')`);
    }

    // 🔥 CONDITIONS
    conditions.forEach(c => {
      if (c.field === "open_quantity") {
        where.push(`PD.${PD.columns.PDUOPN} ${c.op} ${c.value}`);
      }
    });

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // 🔥 AGGREGATION
    if (aggregation === "SUM") {

      if (
        question.includes("amount") ||
        question.includes("cost") ||
        question.includes("value")
      ) {
        return `
          SELECT SUM(PD.${PD.columns.PDUORG}) AS total_purchase_amount
          FROM dbo.${PD.table} PD
          ${whereSQL}
        `;
      }

      return `
        SELECT SUM(PD.${PD.columns.PDUORG}) AS total_purchase_quantity
        FROM dbo.${PD.table} PD
        ${whereSQL}
      `;
    }

    return `
      SELECT TOP ${limit} *
      FROM dbo.${PO.table} PO
      JOIN dbo.${PD.table} PD
        ON PO.${PO.columns.PHDOCO} = PD.${PD.columns.PDDOCO}
      ${whereSQL}
    `;
  }

  // =====================================================
  // 🔥 STOCKOUT
  // =====================================================
  if (question.includes("stockout")) {

    const I = businessMap.item_master;
    const S = businessMap.inventory;

    return `
      SELECT TOP 20
        I.${I.columns.IMLITM} AS item_number,
        I.${I.columns.IMDSC1} AS description,
        S.${S.columns.LIPQOH} AS quantity_on_hand
      FROM dbo.${I.table} I
      JOIN dbo.${S.table} S
        ON I.${I.columns.IMITM} = S.${S.columns.LIITM}
      WHERE S.${S.columns.LIPQOH} < 50
      ORDER BY S.${S.columns.LIPQOH} ASC
    `;
  }

  // =====================================================
  // 🔥 CUSTOMER
  // =====================================================
  if (intent === "customer") {
    const C = businessMap.customer;
    return `SELECT TOP ${limit} * FROM dbo.${C.table}`;
  }

  // =====================================================
  // 🔥 ITEM
  // =====================================================
  // =====================================================
// 🔥 ITEM (WITH STOCK SUPPORT)
// =====================================================
    if (intent === "item") {

      const I = businessMap.item_master;
      const S = businessMap.inventory;
      const C = businessMap.item_cost;

      const needsStock =
        question.includes("stock") ||
        question.includes("inventory") ||
        question.includes("on hand");

      const needsPrice =
        question.includes("price") ||
        question.includes("cost") ||
        question.includes("amount");

      // =====================================================
      // 🔥 ITEM + PRICE + STOCK (COMBINED)
      // =====================================================
      if (needsStock && needsPrice) {
        return `
          SELECT TOP ${limit}
            I.${I.columns.IMLITM} AS item_number,
            I.${I.columns.IMDSC1} AS description,
            I.${I.columns.IMSRP1} AS category,
            C.${C.columns.IBROPI} AS price,
            S.${S.columns.LIPQOH} AS quantity_on_hand
          FROM dbo.${I.table} I
          LEFT JOIN dbo.${C.table} C
            ON I.${I.columns.IMITM} = C.${C.columns.IBITM}
          LEFT JOIN dbo.${S.table} S
            ON I.${I.columns.IMITM} = S.${S.columns.LIITM}
        `;
      }

      // =====================================================
      // 🔥 ITEM + PRICE
      // =====================================================
      if (needsPrice) {
        return `
          SELECT TOP ${limit}
            I.${I.columns.IMLITM} AS item_number,
            I.${I.columns.IMDSC1} AS description,
            I.${I.columns.IMSRP1} AS category,
            C.${C.columns.IBROPI} AS price
          FROM dbo.${I.table} I
          LEFT JOIN dbo.${C.table} C
            ON I.${I.columns.IMITM} = C.${C.columns.IBITM}
        `;
      }

      // =====================================================
      // 🔥 ITEM + STOCK
      // =====================================================
      if (needsStock) {
        return `
          SELECT TOP ${limit}
            I.${I.columns.IMLITM} AS item_number,
            I.${I.columns.IMDSC1} AS description,
            I.${I.columns.IMSRP1} AS category,
            S.${S.columns.LIPQOH} AS quantity_on_hand
          FROM dbo.${I.table} I
          LEFT JOIN dbo.${S.table} S
            ON I.${I.columns.IMITM} = S.${S.columns.LIITM}
        `;
      }

      // =====================================================
      // 🔥 DEFAULT ITEM
      // =====================================================
      return `
        SELECT TOP ${limit} *
        FROM dbo.${I.table}
      `;
    }

  return null;
}

module.exports = { buildQuery };