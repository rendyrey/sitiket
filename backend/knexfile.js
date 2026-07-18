import "dotenv/config";

/** @type {import('knex').Knex.Config} */
const config = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "sitiket",
    password: process.env.DB_PASSWORD || "sitiket_dev_password",
    database: process.env.DB_NAME || "sitiket",
    timezone: "Z",
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: "./src/db/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./src/db/seeds",
  },
};

export default config;
