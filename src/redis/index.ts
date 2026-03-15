import { createClient } from "redis";
import config from "@root/config";

const client = createClient({
    url: config.redis.url,
});

await client.connect();

export default client;
