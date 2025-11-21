import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/api";

dotenv.config();

const app = express();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
