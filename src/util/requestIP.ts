import { type Request } from "express";

function requestIP(req: Request): string {
    let ip =
        (req.headers["x-forwarded-for"] as string) ||
        (req.connection.remoteAddress as string);
    if (ip.startsWith("::ffff:")) {
        ip = ip.slice(7);
    }
    return ip as string;
}

export default requestIP;
