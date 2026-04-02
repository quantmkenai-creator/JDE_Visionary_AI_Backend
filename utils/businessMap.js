// utils/businessMap.js

module.exports = {
  sales_order: {
    table: "F4201",
    columns: {
      SHDOCO: "SHDOCO",
      SHDCTO: "SHDCTO",
      SHAN8: "SHAN8"
    }
  },

  sales_order_detail: {
    table: "F4211",
    columns: {
      SDDOCO: "SDDOCO",
      SDDCTO: "SDDCTO",
      SDITM: "SDITM",
      SDLITM: "SDLITM",
      SDAITM: "SDAITM",
      SDUORG: "SDUORG",
      SDUPRC: "SDUPRC",
      SDNXTR: "SDNXTR",
      SDPRIO: "SDPRIO",
      SDDRQJ: "SDDRQJ",
      SDPDDJ: "SDPDDJ",
      SDSHAN: "SDSHAN"
    }
  },

  customer: {
    table: "F0101",
    columns: {
      ABAN8: "ABAN8",
      ABALPH: "ABALPH",
      ABAT1: "ABAT1"
    }
  },

  address: {
    table: "F0116",
    columns: {
      ALAN8: "ALAN8",
      ALCTY1: "ALCTY1",
      ALCTR: "ALCTR"
    }
  },

  item_master: {
    table: "F4101",
    columns: {
      IMITM: "IMITM",
      IMLITM: "IMLITM",
      IMDSC1: "IMDSC1",
      IMSRP1: "IMSRP1"
    }
  },

  item_cost: {
    table: "F4102",
    columns: {
      IBITM: "IBITM",
      IBROPI: "IBROPI"
    }
  },

  inventory: {
    table: "F41021",
    columns: {
      LIITM: "LIITM",
      LIPQOH: "LIPQOH"
    }
  },

  inventory_ledger: {
    table: "F4111",
    columns: {
      ILITM: "ILITM",
      ILTRDJ: "ILTRDJ",
      ILTRQT: "ILTRQT",
      ID: "ID"
    }
  },

  purchase_order: {
    table: "F4301",
    columns: {
      PHDOCO: "PHDOCO",
      PHDCTO: "PHDCTO",
      PHAN8: "PHAN8",
      PHTRDJ: "PHTRDJ"
    }
  },

  purchase_order_detail: {
    table: "F4311",
    columns: {
      PDDOCO: "PDDOCO",
      PDDCTO: "PDDCTO",
      PDAN8: "PDAN8",
      PDDRQJ: "PDDRQJ",
      PDPDDJ: "PDPDDJ",
      PDTRDJ: "PDTRDJ",
      PDUORG: "PDUORG",
      PDUOPN: "PDUOPN",
      PDNXTR: "PDNXTR",
      PDLNID: "PDLNID"
    }
  },

  purchase_receipt: {
    table: "F43121",
    columns: {
      PRDOCO: "PRDOCO",
      PRDCTO: "PRDCTO",
      PRLNID: "PRLNID",
      PRRCDJ: "PRRCDJ",
      ID: "ID"
    }
  }
};