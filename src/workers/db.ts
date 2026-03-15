import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@db/schema";
import config from "@root/config";

// Dedicated connection for the worker — isolated from the Express app's pool.
// Keeps worker transactions from blocking API queries and vice versa.
const workerConn = postgres(config.db.url, { max: 3 });
export const workerDb = drizzle(workerConn, { schema });
