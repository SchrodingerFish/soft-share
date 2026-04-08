import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Download, Heart, Monitor, Smartphone, Apple, Calendar, Flame, Copy } from "lucide-react";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export interface Software {
  id: number;
  name: string;
  version: string;
  platforms: string[];
  category: string;
  size: string;
  update_date: string;
  description: string;
  screenshots: string[];
  popularity: number;
}

export const SoftwareCard: React.FC<{ software: Software; onDownload: (id: number) => void }> = ({ software, onDownload }) => {
  const { lang } = useAppStore();
  const t = translations[lang];
  const { user } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApi<{ isFavorite: boolean }>(`/favorites/${software.id}`).then(res => {
        if (res.code === 0) setIsFavorite(res.data.isFavorite);
      });
    }
  }, [user, software.id]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }
    const res = await fetchApi<{ isFavorite: boolean }>("/favorites", {
      method: "POST",
      body: JSON.stringify({ software_id: software.id })
    });
    if (res.code === 0) {
      setIsFavorite(res.data.isFavorite);
      toast.success(res.data.isFavorite ? "Added to favorites" : "Removed from favorites");
    }
  };

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(software.id.toString());
    toast.success(`Copied ID: ${software.id}`);
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform === "Windows") return <Monitor className="w-4 h-4" />;
    if (platform === "macOS") return <Apple className="w-4 h-4" />;
    if (platform === "Android") return <Smartphone className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
      {software.screenshots && software.screenshots.length > 0 && (
        <div className="h-40 w-full overflow-hidden bg-muted">
          <img src={software.screenshots[0]} alt={software.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      )}
      <CardHeader className="flex-none">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{software.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{software.version}</Badge>
              <span className="text-xs">{software.size}</span>
              <span 
                className="text-xs flex items-center gap-1 text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-muted/80 transition-colors" 
                onClick={copyId} 
                title="Copy ID"
              >
                ID: {software.id}
                <Copy className="w-3 h-3" />
              </span>
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleFavorite} className={isFavorite ? "text-red-500" : "text-muted-foreground"}>
            <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{software.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {software.platforms.map(p => (
            <Badge key={p} variant="outline" className="flex items-center gap-1">
              <PlatformIcon platform={p} />
              {p}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 bg-muted/50 py-4 mt-auto">
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5" title={t.update_date}>
            <Calendar className="w-3.5 h-3.5" />
            {software.update_date}
          </span>
          <span className="flex items-center gap-1.5" title={t.popularity}>
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            {software.popularity}
          </span>
        </div>
        <Button onClick={() => onDownload(software.id)} className="w-full gap-2">
          <Download className="w-4 h-4" />
          {t.download}
        </Button>
      </CardFooter>
    </Card>
  );
}
