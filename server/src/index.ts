import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/api";
import { testConnection } from "./config/database";

dotenv.config();

const app = express();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await testConnection();
});
