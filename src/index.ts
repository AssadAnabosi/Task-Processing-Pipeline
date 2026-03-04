import express from "express";
import config from "./config";
import apiRouter from "./api";


const app = express();

app.use(express.json());

app.use("/api", apiRouter);

// Handle undefined routes
app.use((_req, res) => {
    return res.status(404).json({
        message:
            "Oops, you have reached an undefined route, please check your request and try again",
    });
});

app.listen(config.api.port, () => {
    console.log(`Server is running on port ${config.api.port} in ${config.api.platform} mode`);
});
