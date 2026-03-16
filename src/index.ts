import express from "express";

import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import config from "./config";
import { NOT_FOUND } from "@util/constants/statusCodes";

import { middlewareErrorHandler } from "@middleware/errorHandler";

import apiRouter from "./api";

async function main() {
    // Run database migrations before starting the server
    if (config.api.platform == "development") {
        try {
            const migrationClient = postgres(config.db.url, { max: 1 });
            await migrate(drizzle(migrationClient), config.db.migrationConfig);
        } catch (err) {
            console.error("Database migration failed:", err);
            process.exit(1);
        }
    }

    const app = express();

    app.use(express.json());

    app.use("/api", apiRouter);

    // Handle undefined routes
    app.use((_req, res) => {
        return res.status(NOT_FOUND).json({
            message:
                "Oops, you have reached an undefined route, please check your request and try again",
        });
    });

    // !!! Error handling middleware (should be last in the middleware stack) !!!
    app.use(middlewareErrorHandler);

    app.listen(config.api.port, () => {
        console.log(
            `Server is running on port ${config.api.port} in ${config.api.platform} mode`
        );
    });
}

main();
