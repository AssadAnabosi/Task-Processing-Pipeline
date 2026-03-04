import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import config from "@root/config";

const conn = postgres(config.db.url);
const db = drizzle(conn, { schema });

export default db;
