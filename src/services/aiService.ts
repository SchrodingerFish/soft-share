import { fetchApi } from "../lib/api";
import { useAppStore, AIConfig } from "../store";

export const aiService = {
  async recommendSoftware(userQuery: string, softwareList: any[]) {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/recommend", {
      method: "POST",
      body: JSON.stringify({ query: userQuery, softwareList, config })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  },

  async generateSoftwareDetails(name: string) {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/generate-details", {
      method: "POST",
      body: JSON.stringify({ name, config })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  },

  async compareSoftware(softwareA: any, softwareB: any) {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/compare", {
      method: "POST",
      body: JSON.stringify({ softwareA, softwareB, config })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  },

  async summarizeSoftware(software: any) {
    const config = useAppStore.getState().aiConfig;
    const res = await fetchApi<any>("/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ software, config })
    });
    if (res.code !== 0) throw new Error(res.message);
    return res.data;
  }
};
