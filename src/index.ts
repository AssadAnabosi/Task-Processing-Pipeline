import express from "express";
import apiRouter from "./api";

const app = express();

const PORT = process.env.PORT || 8001;

app.use("/api/v1", apiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
