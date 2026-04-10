import React, { useState } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { aiService } from "../services/aiService";
import { fetchApi } from "../lib/api";
import { Software, SoftwareCard } from "./SoftwareCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

export const AIAssistant: React.FC<{ onDownload: (id: number) => void }> = ({ onDownload }) => {
  const { lang } = useAppStore();
  const t = translations[lang];
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    recommendation: string;
    softwareIds: number[];
    tips: string;
    recommendedSoftware?: Software[];
  } | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // 1. Get all software for context
      const allRes = await fetchApi<{ items: Software[] }>("/software?limit=100");
      if (allRes.code !== 0) throw new Error("Failed to fetch software list");
      
      // 2. Ask AI
      const aiResult = await aiService.recommendSoftware(query, allRes.data.items);
      
      // 3. Map IDs to actual software objects
      const recommendedSoftware = allRes.data.items.filter(s => aiResult.softwareIds.includes(s.id));
      
      setResult({ ...aiResult, recommendedSoftware });
    } catch (err: any) {
      setError(err.message || "AI assistant is currently unavailable. Please check your API key settings or try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4">
          <Bot className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{t.ai_assistant_title}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t.ai_assistant_desc}
        </p>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
        <div className="relative flex gap-2 p-2 bg-card border rounded-2xl shadow-xl">
          <Input 
            placeholder={t.ai_assistant_placeholder}
            className="border-none focus-visible:ring-0 text-lg h-14"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button 
            size="lg" 
            className="h-14 px-8 rounded-xl" 
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
            {t.ask_ai}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl bg-primary/30 animate-pulse"></div>
              <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold text-foreground">AI is analyzing your request</h3>
              <p className="text-muted-foreground animate-pulse">Searching through our software database to find the perfect match...</p>
            </div>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-destructive/10 text-destructive p-8 rounded-2xl border border-destructive/20 flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto"
          >
            <div className="bg-destructive/20 p-4 rounded-full">
              <Bot className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Oops! Something went wrong</h3>
              <p className="text-destructive/80">{error}</p>
            </div>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-muted/50 p-6 rounded-2xl border border-primary/20 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Sparkles className="h-5 w-5" />
                AI Recommendation
              </div>
              <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                <Markdown>
                  {typeof result.recommendation === 'object' ? JSON.stringify(result.recommendation) : String(result.recommendation || "")}
                </Markdown>
              </div>
              {result.tips && (
                <div className="pt-4 border-t border-primary/10">
                  <h4 className="font-semibold mb-2">Pro Tips:</h4>
                  <div className="markdown-body prose prose-sm dark:prose-invert max-w-none italic text-muted-foreground">
                    <Markdown>
                      {typeof result.tips === 'object' ? JSON.stringify(result.tips) : String(result.tips || "")}
                    </Markdown>
                  </div>
                </div>
              )}
            </div>

            {result.recommendedSoftware && result.recommendedSoftware.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {result.recommendedSoftware.map(s => (
                  <SoftwareCard key={s.id} software={s} onDownload={onDownload} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
