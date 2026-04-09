import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Software, SoftwareCard } from "./SoftwareCard";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

export const Recommendations: React.FC<{ onDownload: (id: number) => void; onDetail: (id: number) => void }> = ({ onDownload, onDetail }) => {
  const { lang } = useAppStore();
  const { user } = useAuthStore();
  const t = translations[lang];
  
  const [items, setItems] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchRecs = async () => {
      setLoading(true);
      try {
        const res = await fetchApi<Software[]>("/user/recommendations");
        if (res.code === 0) setItems(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecs();
  }, [user]);

  if (!user || (!loading && items.length === 0)) return null;

  return (
    <div className="space-y-6 py-8 border-b">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t.guess_you_like || "Guess You Like"}</h2>
          <p className="text-muted-foreground text-sm">Based on your favorites</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
          ))
        ) : (
          items.slice(0, 3).map((software, index) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              key={software.id}
              onClick={() => onDetail(software.id)}
              className="cursor-pointer"
            >
              <SoftwareCard software={software} onDownload={onDownload} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
