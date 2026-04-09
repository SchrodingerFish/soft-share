import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { aiService } from "../services/aiService";
import { Software } from "./SoftwareCard";
import { Button } from "./ui/button";
import { Sparkles, Loader2, Scale, Check, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import Markdown from "react-markdown";

export const SoftwareComparison: React.FC<{ 
  softwareA: Software; 
  softwareB: Software; 
  onBack: () => void 
}> = ({ softwareA, softwareB, onBack }) => {
  const { lang } = useAppStore();
  const t = translations[lang];
  
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<{
    comparisonTable: { feature: string; softwareAValue: string; softwareBValue: string }[];
    analysis: string;
    verdict: string;
  } | null>(null);

  useEffect(() => {
    const loadComparison = async () => {
      setLoading(true);
      try {
        const res = await aiService.compareSoftware(softwareA, softwareB);
        setComparison(res);
      } catch (err: any) {
        toast.error(err.message || "Failed to generate comparison");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadComparison();
  }, [softwareA, softwareB]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-xl font-medium animate-pulse">AI is analyzing software features...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t.back_to_list}
      </Button>

      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4">
          <Scale className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">AI Software Comparison</h2>
        <p className="text-muted-foreground">
          Comparing <span className="font-bold text-foreground">{softwareA.name}</span> vs <span className="font-bold text-foreground">{softwareB.name}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-4 font-semibold border-b">Feature</th>
              <th className="p-4 font-semibold border-b text-center">{softwareA.name}</th>
              <th className="p-4 font-semibold border-b text-center">{softwareB.name}</th>
            </tr>
          </thead>
          <tbody>
            {comparison?.comparisonTable.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 border-b font-medium">{row.feature}</td>
                <td className="p-4 border-b text-center text-muted-foreground">
                  {typeof row.softwareAValue === 'object' ? JSON.stringify(row.softwareAValue) : String(row.softwareAValue)}
                </td>
                <td className="p-4 border-b text-center text-muted-foreground">
                  {typeof row.softwareBValue === 'object' ? JSON.stringify(row.softwareBValue) : String(row.softwareBValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-muted/30 p-8 rounded-2xl border space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Analysis
          </h3>
          <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
            <Markdown>
              {typeof comparison?.analysis === 'object' ? JSON.stringify(comparison?.analysis) : String(comparison?.analysis || "")}
            </Markdown>
          </div>
        </div>

        <div className="bg-primary/5 p-8 rounded-2xl border border-primary/20 space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            AI Verdict
          </h3>
          <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
            <Markdown>
              {typeof comparison?.verdict === 'object' ? JSON.stringify(comparison?.verdict) : String(comparison?.verdict || "")}
            </Markdown>
          </div>
        </div>
      </div>
    </div>
  );
};
