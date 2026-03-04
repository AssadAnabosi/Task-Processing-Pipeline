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

const config: { api: APIConfig } = {
    api: {
        port: parseInt(envOrThrow("PORT"), 10),
        platform: process.env.NODE_ENV || "development",
    },
};

export default config;