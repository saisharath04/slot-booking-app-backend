import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const createPool = () => {
  return mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    insecureAuth: true,
    port: Number(process.env.PORT) || 8000,
  });
};

// export default createPool;
module.exports = createPool;
