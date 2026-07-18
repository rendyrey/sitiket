import knexFactory from "knex";
import { env } from "./env.js";

export const db = knexFactory({
  client: "mysql2",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    timezone: "Z",
  },
  pool: { min: 2, max: 10 },
});
