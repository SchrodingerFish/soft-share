import { Router } from "express";
import { aiService, AIConfig } from "../services/aiService.js";
import { aiLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/recommend", aiLimiter, async (req, res) => {
  try {
    const { query, softwareList, config, lang } = req.body;
    const result = await aiService.recommendSoftware(query, softwareList, config, lang);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/generate-details", aiLimiter, async (req, res) => {
  try {
    const { name, config, lang } = req.body;
    const result = await aiService.generateSoftwareDetails(name, config, lang);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/compare", aiLimiter, async (req, res) => {
  try {
    const { softwareA, softwareB, config, lang } = req.body;
    const result = await aiService.compareSoftware(softwareA, softwareB, config, lang);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/summarize", aiLimiter, async (req, res) => {
  try {
    const { software, config, lang } = req.body;
    const result = await aiService.summarizeSoftware(software, config, lang);
    res.json({ code: 0, message: "success", data: result });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
