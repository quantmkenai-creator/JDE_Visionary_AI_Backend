module.exports = {
  sales_order: {
    table: "F4201",
    columns: {
      SHDOCO: "order_number",
      SHDCTO: "order_type",
      SHAN8: "customer_id"
    }
  },
  sales_order_detail: {
    table: "F4211",
    columns: {
      SDDOCO: "order_number",
      SDDCTO: "order_type",
      SDITM: "item_number",
      SDLITM: "item_number_display",
      SDAITM: "item_number_alt",
      SDUORG: "quantity",
      SDUPRC: "price",
      SDNXTR: "next_status",
      SDPRIO: "priority",
      SDDRQJ: "request_date",
      SDPDDJ: "promised_date",
      SDSHAN: "ship_to"
    }
  },
  customer: {
    table: "F0101",
    columns: {
      ABAN8: "customer_id",
      ABALPH: "customer_name",
      ABAT1: "search_type"
    }
  },
  address: {
    table: "F0116",
    columns: {
      ALAN8: "address_id",
      ALCTY1: "city",
      ALCTR: "country"
    }
  },
  item_master: {
    table: "F4101",
    columns: {
      IMITM: "item_id",
      IMLITM: "item_number",
      IMDSC1: "description",
      IMSRP1: "category"
    }
  },
  item_cost: {
    table: "F4102",
    columns: {
      IBITM: "item_id",
      IBROPI: "cost_price"
    }
  },
  inventory: {
    table: "F41021",
    columns: {
      LIITM: "item_id",
      LIPQOH: "quantity_on_hand"
    }
  },
  inventory_ledger: {
    table: "F4111",
    columns: {
      ILITM: "item_id",
      ILTRDJ: "transaction_date",
      ILTRQT: "quantity",
      ID: "ledger_id"
    }
  },
  purchase_order: {
    table: "F4301",
    columns: {
      PHDOCO: "po_number",
      PHDCTO: "po_type",
      PHAN8: "supplier_id",
      PHTRDJ: "order_date"
    }
  },
  purchase_order_detail: {
    table: "F4311",
    columns: {
      PDDOCO: "po_number",
      PDDCTO: "po_type",
      PDAN8: "supplier_id",
      PDDRQJ: "request_date",
      PDPDDJ: "promised_date",
      PDTRDJ: "transaction_date",
      PDUORG: "quantity",
      PDUOPN: "open_quantity",
      PDNXTR: "next_status",
      PDLNID: "line_number"
    }
  },
  purchase_receipt: {
    table: "F43121",
    columns: {
      PRDOCO: "po_number",
      PRDCTO: "po_type",
      PRLNID: "line_number",
      PRRCDJ: "receipt_date",
      ID: "receipt_id"
    },
    sales_order_header_extra: {
    table: "F4215",
    columns: {
      XHSHPN: "shipment_number",
      XHAN8: "customer_id"
    }
  },
  }
};

