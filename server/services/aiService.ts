import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = "gemini" | "openai" | "qwen" | "custom";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIResponse {
  recommendation?: string;
  softwareIds?: number[];
  tips?: string;
  description?: string;
  features?: string;
  targetAudience?: string;
  category?: string;
  tutorial?: string;
  comparisonTable?: any[];
  analysis?: string;
  verdict?: string;
  summary?: string;
  highlights?: string[];
}

class AIService {
  private async getProvider(config: AIConfig) {
    const provider = config.provider || "gemini";
    const apiKey = config.apiKey || (provider === "gemini" ? process.env.GEMINI_API_KEY : "");
    
    if (!apiKey && provider !== "custom") {
      throw new Error(`API key for ${provider} is not configured`);
    }

    return { provider, apiKey, baseUrl: config.baseUrl, model: config.model };
  }

  private parseJSONResponse(text: string): any {
    if (!text) return {};
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/^```json\n?/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleanedText);
      
      // Post-process comparisonTable to ensure values are strings
      if (parsed.comparisonTable && Array.isArray(parsed.comparisonTable)) {
        parsed.comparisonTable = parsed.comparisonTable.map((row: any) => ({
          ...row,
          feature: String(row.feature || ""),
          softwareAValue: typeof row.softwareAValue === 'object' ? JSON.stringify(row.softwareAValue) : String(row.softwareAValue || ""),
          softwareBValue: typeof row.softwareBValue === 'object' ? JSON.stringify(row.softwareBValue) : String(row.softwareBValue || "")
        }));
      }

      // Ensure other common fields are strings
      const stringFields = ['recommendation', 'tips', 'description', 'features', 'targetAudience', 'category', 'tutorial', 'summary', 'analysis', 'verdict'];
      stringFields.forEach(field => {
        if (parsed[field] !== undefined) {
          if (typeof parsed[field] === 'object') {
            // If it's an object, try to extract a summary or join keys/values
            const obj = parsed[field];
            if (obj.summary || obj.content || obj.text) {
              parsed[field] = String(obj.summary || obj.content || obj.text);
            } else {
              // Format as "Key: Value" pairs
              parsed[field] = Object.entries(obj)
                .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join('\n\n');
            }
          } else {
            parsed[field] = String(parsed[field]);
          }
        }
      });

      // Ensure highlights is an array of strings
      if (parsed.highlights && Array.isArray(parsed.highlights)) {
        parsed.highlights = parsed.highlights.map((h: any) => typeof h === 'object' ? JSON.stringify(h) : String(h));
      }
      
      return parsed;
    } catch (e) {
      // Fallback: try to find JSON block with regex if the simple replace fails
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          if (parsed.comparisonTable && Array.isArray(parsed.comparisonTable)) {
            parsed.comparisonTable = parsed.comparisonTable.map((row: any) => ({
              ...row,
              feature: String(row.feature || ""),
              softwareAValue: typeof row.softwareAValue === 'object' ? JSON.stringify(row.softwareAValue) : String(row.softwareAValue || ""),
              softwareBValue: typeof row.softwareBValue === 'object' ? JSON.stringify(row.softwareBValue) : String(row.softwareBValue || "")
            }));
          }

          const stringFields = ['recommendation', 'tips', 'description', 'features', 'targetAudience', 'category', 'tutorial', 'summary', 'analysis', 'verdict'];
          stringFields.forEach(field => {
            if (parsed[field] !== undefined) {
              if (typeof parsed[field] === 'object') {
                const obj = parsed[field];
                if (obj.summary || obj.content || obj.text) {
                  parsed[field] = String(obj.summary || obj.content || obj.text);
                } else {
                  parsed[field] = Object.entries(obj)
                    .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                    .join('\n\n');
                }
              } else {
                parsed[field] = String(parsed[field]);
              }
            }
          });

          if (parsed.highlights && Array.isArray(parsed.highlights)) {
            parsed.highlights = parsed.highlights.map((h: any) => typeof h === 'object' ? JSON.stringify(h) : String(h));
          }

          return parsed;
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", jsonMatch[0]);
        }
      }
      console.error("Failed to parse AI response:", text);
      return {};
    }
  }

  async callAI(prompt: string, config: AIConfig, responseSchema?: any, retryCount = 0): Promise<any> {
    try {
      const { provider, apiKey, baseUrl, model } = await this.getProvider(config);

      if (provider === "gemini") {
        const genAI = new GoogleGenAI({ apiKey: apiKey! });
        
        const result = await genAI.models.generateContent({
          model: model || "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        
        const text = result.candidates[0].content.parts[0].text || "{}";
        return this.parseJSONResponse(text);
      } else {
        // OpenAI compatible (OpenAI, Qwen, Custom)
        const openai = new OpenAI({
          apiKey: apiKey!,
          baseURL: baseUrl || (provider === "openai" ? "https://api.openai.com/v1" : undefined),
        });

        const response = await openai.chat.completions.create({
          model: model || (provider === "openai" ? "gpt-4o" : "qwen-max"),
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        const text = response.choices[0].message.content || "{}";
        return this.parseJSONResponse(text);
      }
    } catch (err: any) {
      console.error(`AI Call Error (Attempt ${retryCount + 1}):`, err);
      
      // Retry logic for 503 errors (high demand)
      if ((err.message?.includes("503") || err.message?.includes("high demand")) && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callAI(prompt, config, responseSchema, retryCount + 1);
      }

      let message = err.message || "AI Service Error";
      
      // Handle specific Gemini error structures if they come as strings
      if (message.includes("quota") || message.includes("429")) {
        message = "AI Quota exceeded. Please try again later or use your own API key.";
      } else if (message.includes("API key not valid") || message.includes("400")) {
        message = "Invalid AI API key. Please check your configuration.";
      } else if (message.includes("high demand") || message.includes("503")) {
        message = "AI model is currently busy. Please try again in a few moments.";
      }
      
      throw new Error(message);
    }
  }

  async recommendSoftware(userQuery: string, softwareList: any[], config: AIConfig, lang: string = "zh") {
    const context = softwareList.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      platforms: s.platforms
    }));

    const langInstruction = lang === "zh" ? "Please respond in Chinese." : "Please respond in English.";

    const prompt = `You are a professional software consultant. Based on the following software library, recommend the best tools for the user's request.
    
    Library: ${JSON.stringify(context)}
    
    User Request: "${userQuery}"
    
    ${langInstruction}
    
    Return a JSON object with:
    - recommendation: A brief explanation of why these are recommended.
    - softwareIds: An array of IDs of the recommended software from the library.
    - tips: Some usage tips for the recommended software.`;

    return this.callAI(prompt, config);
  }

  async generateSoftwareDetails(name: string, config: AIConfig, lang: string = "zh") {
    const langInstruction = lang === "zh" ? "Please respond in Chinese." : "Please respond in English.";
    const prompt = `Generate professional software details for a software named "${name}".
    
    ${langInstruction}
    
    Return a JSON object with:
    - description: A professional description (around 100 words).
    - features: A summary of key features.
    - targetAudience: Who is this software for?
    - category: One of [Dev, System, Download, Media, Productivity, Design].
    - tutorial: A brief markdown tutorial on how to get started.`;

    return this.callAI(prompt, config);
  }

  async compareSoftware(softwareA: any, softwareB: any, config: AIConfig, lang: string = "zh") {
    const langInstruction = lang === "zh" ? "Please respond in Chinese." : "Please respond in English.";
    const prompt = `Compare these two software items and provide a detailed analysis.
    
    Software A: ${JSON.stringify(softwareA)}
    Software B: ${JSON.stringify(softwareB)}
    
    ${langInstruction}
    
    Return a JSON object with:
    - comparisonTable: An array of objects for a comparison table (feature, softwareAValue, softwareBValue).
    - analysis: A detailed markdown string summarizing pros and cons for each.
    - verdict: A clear markdown string explaining which one should the user choose in different scenarios.`;

    return this.callAI(prompt, config);
  }

  async summarizeSoftware(software: any, config: AIConfig, lang: string = "zh") {
    const langInstruction = lang === "zh" ? "Please respond in Chinese." : "Please respond in English.";
    const prompt = `Provide a concise AI summary for the following software. Focus on its core value proposition and unique features.
    
    Software Info: ${JSON.stringify({
      name: software.name,
      description: software.description,
      category: software.category,
      version: software.version
    })}
    
    ${langInstruction}
    
    Return a JSON object with:
    - summary: A concise summary (around 50-80 words).
    - highlights: An array of 3-4 key highlights or unique selling points.`;

    return this.callAI(prompt, config);
  }
}

export const aiService = new AIService();
