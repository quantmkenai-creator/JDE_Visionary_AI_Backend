import mssql from "mssql";

// MSSQL config using approved env vars
const config = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    port: parseInt(process.env.DB_PORT) || 1433,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 60000,
};

const sql = mssql;
export { sql, config };

// Function to get connection (async, mimics mysql pool)
export const getConnection = async () => {
  try {
    return await sql.connect(config);
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
};

export default { sql, getConnection, config };
