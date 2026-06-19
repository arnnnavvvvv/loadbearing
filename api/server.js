import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../dashboard")));

app.post("/analyze", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  try {
    const result = await runPipeline(repoUrl);
    res.json(result);
  } catch (err) {
    console.error("[/analyze] pipeline failed:", err);
    res.status(500).json({ error: "Analysis failed. Check server logs." });
  }
});

app.listen(PORT, () => {
  console.log(`Loadbearing running at http://localhost:${PORT}`);
});