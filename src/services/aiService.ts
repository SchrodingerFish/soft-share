import { fetchApi } from "../lib/api";
import { useAppStore, AIConfig } from "../store";

export const aiService = {
  async recommendSoftware(userQuery: string, softwareList: any[], lang: string = "zh") {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/recommend", {
      method: "POST",
      body: JSON.stringify({ query: userQuery, softwareList, config, lang })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  },

  async generateSoftwareDetails(name: string, lang: string = "zh") {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/generate-details", {
      method: "POST",
      body: JSON.stringify({ name, config, lang })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  },

  async compareSoftware(softwareA: any, softwareB: any, lang: string = "zh") {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/compare", {
      method: "POST",
      body: JSON.stringify({ softwareA, softwareB, config, lang })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  },

  async summarizeSoftware(software: any, lang: string = "zh") {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ software, config, lang })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }
};
