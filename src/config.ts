import type { MigrationConfig } from "drizzle-orm/migrator";

function envOrThrow(key: string): string {
    const val = process.env[key];
    if (!val) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return val;
}

type APIConfig = {
    port: number;
    platform: string;
};

type DBConfig = {
    url: string;
    migrationConfig: MigrationConfig;
};

type RedisConfig = {
    url: string;
};

const config: { api: APIConfig; db: DBConfig; redis: RedisConfig } = {
    api: {
        port: parseInt(envOrThrow("PORT"), 10),
        platform: process.env.NODE_ENV || "development",
    },
    db: {
        url: `postgres://${envOrThrow("POSTGRES_USER")}:${envOrThrow("POSTGRES_PASSWORD")}@${envOrThrow("POSTGRES_HOST")}:${envOrThrow("POSTGRES_PORT")}/${envOrThrow("POSTGRES_DB")}?sslmode=disable`,
        migrationConfig: {
            migrationsFolder: "./drizzle/migrations",
        },
    },
    redis: {
        url: envOrThrow("REDIS_URL"),
    },
};

export default config;
