import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import client from "@root/redis";

import { TooManyRequestsError } from "@util/responseErrors.js";
import requestIP from "@util/requestIP.js";

const limiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 1, // limit each IP to 1 requests per windowMs
    message: {
        message: "Too many requests from this IP, please try again in a while",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, _res, _next, options) => {
        console.log(`🚩  [${requestIP(req)}] has been rate limited`);
        throw new TooManyRequestsError(options.message.message);
    },
    store: new RedisStore({
        sendCommand: (...args: string[]) => client.sendCommand(args),
    }),
});

export default limiter;
