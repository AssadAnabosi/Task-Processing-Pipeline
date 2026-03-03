import express from "express";

const app = express();

const PORT = process.env.PORT || 8001;

app.get("/api", (req, res) => {
    res.status(200).json({ message: "Hello from the API!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
