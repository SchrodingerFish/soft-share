import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Flame, TrendingUp, Download, ArrowRight, Trophy } from "lucide-react";
import { motion } from "motion/react";

export const Rankings: React.FC<{ onSelect: (id: number) => void }> = ({ onSelect }) => {
  const { lang } = useAppStore();
  const t = translations[lang];
  
  const [activeTab, setActiveTab] = useState<"hot" | "weekly">("hot");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any[]>(`/rankings/${activeTab}`);
      if (res.code === 0) setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [activeTab]);

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            {t.rankings}
          </h2>
          <p className="text-muted-foreground mt-1">Discover what's trending in the community</p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl">
          <Button 
            variant={activeTab === "hot" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("hot")}
            className="rounded-lg"
          >
            <Flame className="mr-2 h-4 w-4 text-orange-500" />
            {t.hot_today}
          </Button>
          <Button 
            variant={activeTab === "weekly" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("weekly")}
            className="rounded-lg"
          >
            <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
            {t.weekly_rank}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))
        ) : (
          items.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={item.id}
              className="group flex items-center gap-4 bg-card border rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => onSelect(item.id)}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                index === 0 ? 'bg-yellow-500 text-white' : 
                index === 1 ? 'bg-slate-300 text-slate-700' :
                index === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate group-hover:text-primary transition-colors">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {item.download_count} {t.downloads}
                  </span>
                </div>
              </div>

              <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
