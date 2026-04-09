import { Router } from "express";
import { aiService, AIConfig } from "../services/aiService.js";

const router = Router();

router.post("/recommend", async (req, res) => {
  try {
    const { query, softwareList, config } = req.body;
    const result = await aiService.recommendSoftware(query, softwareList, config);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/generate-details", async (req, res) => {
  try {
    const { name, config } = req.body;
    const result = await aiService.generateSoftwareDetails(name, config);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/compare", async (req, res) => {
  try {
    const { softwareA, softwareB, config } = req.body;
    const result = await aiService.compareSoftware(softwareA, softwareB, config);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/summarize", async (req, res) => {
  try {
    const { software, config } = req.body;
    const result = await aiService.summarizeSoftware(software, config);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
