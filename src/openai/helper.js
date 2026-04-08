import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";
dotenv.config();

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

async function generateSQL(question) {
  const schema = {
  tables: {
    F0101: {
      description: "Customer Master",
      columns: {
        ABAN8: "customer_id",
        ABALPH: "customer_name",
        ABAT1: "customer_type"
      }
    },

    F0116: {
      description: "Customer Address",
      columns: {
        ALAN8: "customer_id",
        ALCTY1: "city",
        ALCTR: "country"
      }
    },

    F4101: {
      description: "Item Master",
      columns: {
        IMITM: "item_id",
        IMLITM: "item_number",
        IMDSC1: "description",
        IMSRP1: "category"
      }
    },

    F4102: {
      description: "Item Cost",
      columns: {
        IBITM: "item_id",
        IBROPI: "unit_cost"
      }
    },

    F41021: {
      description: "Inventory Balance",
      columns: {
        LIITM: "item_id",
        LIPQOH: "quantity_on_hand"
      }
    },

    F4111: {
      description: "Inventory Transactions",
      columns: {
        ILITM: "item_id",
        ILTRDJ: "transaction_date",
        ILTRQT: "quantity",
        ID: "transaction_id"
      }
    },

    F4201: {
      description: "Sales Order Header",
      columns: {
        SHDOCO: "order_number",
        SHDCTO: "order_type",
        SHAN8: "customer_id"
      }
    },

    F4211: {
      description: "Sales Order Detail",
      columns: {
        SDDOCO: "order_number",
        SDDCTO: "order_type",
        SDITM: "item_id",
        SDLITM: "item_number",
        SDAITM: "alt_item",
        SDUORG: "quantity",
        SDUPRC: "unit_price",
        SDDRQJ: "requested_date",
        SDNXTR: "status",
        SDPRIO: "priority",
        SDSHAN: "ship_to",
        SDPDDJ: "promised_date"
      }
    },

    F4215: {
      description: "Shipment Info",
      columns: {
        XHSHPN: "shipment_number",
        XHAN8: "customer_id"
      }
    },

    F4301: {
      description: "Purchase Order Header",
      columns: {
        PHDOCO: "po_number",
        PHDCTO: "po_type",
        PHTRDJ: "order_date",
        PHAN8: "supplier_id"
      }
    },

    F4311: {
      description: "Purchase Order Detail",
      columns: {
        PDDOCO: "po_number",
        PDDCTO: "po_type",
        PDAN8: "supplier_id",
        PDDRQJ: "requested_date",
        PDNXTR: "status",
        PDPDDJ: "promised_date",
        PDTRDJ: "transaction_date",
        PDUORG: "quantity_ordered",
        PDUOPN: "quantity_open",
        PDLNID: "line_number"
      }
    },

    F43121: {
      description: "Purchase Receipt",
      columns: {
        PRDOCO: "po_number",
        PRDCTO: "po_type",
        PRLNID: "line_number",
        PRRCDJ: "receipt_date",
        ID: "receipt_id"
      }
    }
  }
};

  const tablesList = Object.keys(schema.tables).map(t => `${t} (${schema.tables[t].description})`).join(", ");
  const allColumns = [...new Set(Object.values(schema.tables).flatMap(table => Object.keys(table.columns)))].join(", ");

const prompt = `You are a JDE ERP SQL Chatbot. Generate SQL for questions like: "Show top 5 records from F0101", "List all sales orders", "Total sales quantity per customer", "Show high priority sales orders", "Purchase orders with open qty >5", etc.

ALWAYS:
- **🚨 JULIAN DATES: Convert JDE dates (SDDRQJ,SDPDDJ,PHTRDJ,PDDRQJ,ILTRDJ,PRRCDJ = YYDDD): CONVERT(VARCHAR(10), DATEADD(day, RIGHT(col,3)-1, DATEFROMPARTS(LEFT(col,2)+2000,1,1)), 120) AS date_name (24150→2024-05-30)**
- Use SELECT col AS friendly_name (e.g. ABAN8 AS customer_id, SDUORG AS quantity, SDUPRC AS unit_price)
- Tables: F0101(c), F4201(sh), F4211(sod), F4301(ph), F4311(pod), F4101(i), F41021(inv)
- Joins: F0101.c.ABAN8 = F4201.sh.SHAN8 AND F4201.sh.SHDOCO = F4211.sod.SDDOCO (sales qty/customer); F4301.ph.PHDOCO = F4311.pod.PDDOCO (POs)
- TOP 5/10 for "top"/"list", no LIMIT if "all"
- Status: SDNXTR='210' open/in-progress, '999' complete, SDPRIO='HIGH' high priority
- Aggregates: SUM(SDUORG) total_qty, SUM(SDUORG*SDUPRC) amount, COUNT(SHDOCO) orders
- Recent/top: ORDER BY converted_SDDRQJ DESC; MAX(converted_SDDRQJ) if GROUP BY
- Critical: open qty high, delayed promised_date, priority high
- Output **ONLY RAW SQL** for ALL data/business questions. **NEVER explain or add text/comments**. Return {response: "chat"} ONLY for greetings/chit-chat.
- For sales orders + customer + quantity: ALWAYS join F4211 (qty=SDUORG), F4201 (header), F0101 (customer); GROUP BY order/customer; ORDER BY MAX(SDDRQJ) DESC

Schema Tables: ${tablesList}
Columns (JDE→friendly): ${allColumns}

Examples logic:
"Show top 5 F0101": SELECT TOP 5 ABAN8 AS customer_id, ABALPH AS customer_name FROM F0101 ORDER BY ABAN8
"List sales orders qty price": SELECT TOP 100 sod.SDDOCO AS order_number, sod.SDLITM AS item_number, SUM(sod.SDUORG) AS quantity, AVG(sod.SDUPRC) AS unit_price FROM F4211 sod JOIN F4201 sh ON sh.SHDOCO = sod.SDDOCO GROUP BY sod.SDDOCO, sod.SDLITM ORDER BY MAX(sod.SDDRQJ) DESC
"Total sales qty": SELECT SUM(SDUORG) AS total_quantity FROM F4211
"Total sales per customer": SELECT sh.SHAN8 AS customer_id, c.ABALPH AS customer_name, SUM(sod.SDUORG) AS total_qty FROM F4201 sh JOIN F4211 sod ON sh.SHDOCO=sod.SDDOCO JOIN F0101 c ON sh.SHAN8=c.ABAN8 GROUP BY sh.SHAN8, c.ABALPH
"High priority sales": SELECT TOP 100 * FROM F4211 WHERE SDPRIO = 'HIGH' ORDER BY SDPDDJ
"Open PO qty >5": SELECT TOP 100 PDDOCO AS po_number, PDUOPN AS open_qty FROM F4311 WHERE PDUOPN > 5 AND PDNXTR='210'
"Critical sales orders": SELECT * FROM F4211 WHERE SDNXTR='210' AND SDPDDJ < GETDATE() ORDER BY SDPDDJ  -- delayed
"In progress POs": SELECT ph.PHDOCO, pod.PDUOPN FROM F4301 ph JOIN F4311 pod ON ph.PHDOCO=pod.PDDOCO WHERE pod.PDNXTR='210'
"Sales with customer": SELECT sh.SHDOCO, c.ABALPH AS customer FROM F4201 sh JOIN F0101 c ON sh.SHAN8=c.ABAN8
"Item stock": SELECT i.IMLITM AS item_number, i.IMDSC1 AS description, inv.LIPQOH AS qty_on_hand FROM F4101 i JOIN F41021 inv ON i.IMITM=inv.LIITM

**🚨 ITEM COST/INVENTORY RULE: Item costs + inventory = F4101(i.IMITM)+F4102(cost.IBITM=i.IMITM, IBROPI unit_cost)+F41021(inv.LIITM=i.IMITM, LIPQOH qty_on_hand). For \"item costs from inventory\": JOIN all 3, SELECT item_number, desc, unit_cost, qty, ORDER BY qty DESC**

**ITEM COST EXAMPLE (exact match):**
"Item costs from inventory": SELECT TOP 200 i.IMLITM AS item_number, i.IMDSC1 AS description, cost.IBROPI AS unit_cost, inv.LIPQOH AS qty_on_hand FROM F4101 i JOIN F4102 cost ON i.IMITM = cost.IBITM JOIN F41021 inv ON i.IMITM = inv.LIITM ORDER BY inv.LIPQOH DESC
"Recent sales": SELECT TOP 100 sod.SDDOCO AS order_number, CONVERT(VARCHAR(10), MAX(DATEADD(day,RIGHT(sod.SDDRQJ,3)-1,DATEFROMPARTS(LEFT(sod.SDDRQJ,2)+2000,1,1))), 120) AS requested_date, SUM(sod.SDUORG) AS total_qty FROM F4211 sod JOIN F4201 sh ON sh.SHDOCO=sod.SDDOCO GROUP BY sod.SDDOCO ORDER BY MAX(DATEADD(day,RIGHT(sod.SDDRQJ,3)-1,DATEFROMPARTS(LEFT(sod.SDDRQJ,2)+2000,1,1))) DESC

**JULIAN DATE EXAMPLE:**
"Recent sales dates": SELECT TOP 100 sh.SHDOCO AS order_number, CONVERT(VARCHAR(10), DATEADD(day,RIGHT(sod.SDDRQJ,3)-1,DATEFROMPARTS(LEFT(sod.SDDRQJ,2)+2000,1,1)), 120) AS requested_date, SUM(sod.SDUORG) AS qty FROM F4211 sod JOIN F4201 sh ON sh.SHDOCO=sod.SDDOCO GROUP BY sh.SHDOCO ORDER BY MAX(DATEADD(day,RIGHT(sod.SDDRQJ,3)-1,DATEFROMPARTS(LEFT(sod.SDDRQJ,2)+2000,1,1))) DESC

"List top 10 sales orders with customer and quantity": SELECT TOP 10 sod.SDDOCO AS order_number, c.ABALPH AS customer_name, SUM(sod.SDUORG) AS total_quantity FROM F4211 sod JOIN F4201 sh ON sh.SHDOCO = sod.SDDOCO JOIN F0101 c ON sh.SHAN8 = c.ABAN8 WHERE sod.SDNXTR = '210' GROUP BY sod.SDDOCO, c.ABALPH ORDER BY MAX(sod.SDDRQJ) DESC

**🚨 REPEAT: Sales status ALWAYS sod.SDNXTR='210' for open/in-progress**

**🚨 ABSOLUTE RULES - NO EXCEPTIONS:**
1. SALES QUERIES ONLY F4201(sh.SHDOCO,sh.SHAN8)+F4211(sod.SDDOCO=sh.SHDOCO,sod.SDUORG qty,sod.SDNXTR status='210' open,sod.SDDRQJ date)+F0101(c.ABAN8=sh.SHAN8)
2. PO QUERIES ONLY F4301(ph.PHDOCO,ph.PHAN8)+F4311(pod.PDDOCO=ph.PHDOCO,pod.PDNXTR='210',pod.PDUOPN open_qty)
3. **NEVER** PHDOCO/PDDOCO/PDNXTR on SALES/F42xx. **NEVER** SHDOCO/SDDOCO/SDNXTR on PO/F43xx
4. Status ALWAYS detail line: sod.SDNXTR='210' sales open, pod.PDNXTR='210' PO in-progress
5. Open sales ALWAYS: TOP 100 sod.SDDOCO order#, c.ABALPH customer, SUM(sod.SDUORG) qty, WHERE sod.SDNXTR='210', GROUP sod.SDDOCO,c.ABALPH, ORDER MAX(sod.SDDRQJ) DESC

**STATUS 210 EXAMPLES (exact matches):**
"Open sales orders status 210": SELECT TOP 100 sod.SDDOCO AS sales_order_number, c.ABALPH AS customer_name, SUM(sod.SDUORG) AS total_quantity FROM F4211 sod JOIN F4201 sh ON sh.SHDOCO = sod.SDDOCO JOIN F0101 c ON sh.SHAN8 = c.ABAN8 WHERE sod.SDNXTR = '210' GROUP BY sod.SDDOCO, c.ABALPH ORDER BY MAX(sod.SDDRQJ) DESC
"Open sales orders 210": SELECT TOP 100 sh.SHDOCO AS sales_order_number, c.ABALPH AS customer_name, SUM(sod.SDUORG) AS total_quantity FROM F4201 sh JOIN F4211 sod ON sh.SHDOCO = sod.SDDOCO JOIN F0101 c ON sh.SHAN8 = c.ABAN8 WHERE sod.SDNXTR = '210' GROUP BY sh.SHDOCO, c.ABALPH ORDER BY MAX(sod.SDDRQJ) DESC
"Sales open status 210 qty customer": SELECT TOP 100 sod.SDDOCO AS order_number, c.ABALPH AS customer, SUM(sod.SDUORG) AS qty FROM F4211 sod JOIN F4201 sh ON sod.SDDOCO=sh.SHDOCO JOIN F0101 c ON sh.SHAN8=c.ABAN8 WHERE sod.SDNXTR='210' GROUP BY sod.SDDOCO,c.ABALPH ORDER BY MAX(sod.SDDRQJ) DESC

User: ${question}`;

  const response = await cohere.chat({
    model: "c4ai-aya-expanse-32b",
    message: prompt,
  });

  let content = response.text.trim();

  // Log the generated SQL for debugging
  console.log("Generated SQL Query:", content);

  // ✅ Improved SQL extractor
  content = content
    .replace(/```sql/gi, "")
    .replace(/```/g, "")
    .trim();

  // ✅ If any SQL keyword appears, return cleaned SQL
  if (/^\s*(select|with|insert|update|delete)\b/i.test(content)) {
    return content;
  }

  // Not SQL → return assistant reply
  return { response: "Ask about JDE data: customers F0101, sales F4211, POs F4311, inventory F41021 etc." };
}

export default generateSQL;
