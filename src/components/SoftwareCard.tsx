import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Image } from "./ui/Image";
import { Download, Heart, Monitor, Smartphone, Apple, Calendar, Flame, Copy, Check } from "lucide-react";
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
  download_url: string;
  link_status?: "valid" | "broken";
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  version_history?: { version: string; date: string; content: string }[];
  tutorial?: string;
  verification_code?: string;
  related?: Software[];
  tags?: { name: string; color: string }[];
}

export const SoftwareCard = React.memo(({ software, onDownload }: { software: Software; onDownload: (id: number) => void }) => {
  const { lang } = useAppStore();
  const t = translations[lang];
  const user = useAuthStore(state => state.user);
  const toggleFavoriteId = useAuthStore(state => state.toggleFavoriteId);
  const isFavorite = useAuthStore(state => state.favoriteIds.includes(software.id));

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please login first");
      return;
    }

    // Optimistic update
    toggleFavoriteId(software.id);

    try {
      const res = await fetchApi<{ isFavorite: boolean }>("/favorites", {
        method: "POST",
        body: JSON.stringify({ software_id: software.id })
      });
      
      if (res.code !== 0) {
        // Rollback on error
        toggleFavoriteId(software.id);
        toast.error(res.message || "Failed to update favorite");
      } else {
        toast.success(res.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      }
    } catch (err) {
      // Rollback on error
      toggleFavoriteId(software.id);
      toast.error("Network error");
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
    <Card className={`flex flex-col h-full overflow-hidden hover:shadow-lg transition-all relative ${software.isSelected ? 'ring-2 ring-primary border-primary' : ''}`}>
      {/* Selection Checkbox */}
      {software.onSelect && (
        <div 
          className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${software.isSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background/50 border-white/50 backdrop-blur-sm'}`}
          onClick={(e) => {
            e.stopPropagation();
            software.onSelect?.(software.id);
          }}
        >
          {software.isSelected && <Check className="h-4 w-4" />}
        </div>
      )}
      {software.screenshots && software.screenshots.length > 0 && (
        <Image 
          src={software.screenshots[0]} 
          alt={software.name} 
          className="h-40 w-full object-cover" 
          referrerPolicy="no-referrer" 
        />
      )}
      <CardHeader className="flex-none">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <span 
              className="text-xs flex items-center gap-1 text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-muted/80 transition-colors w-max" 
              onClick={copyId} 
              title="Copy ID"
            >
              ID: {software.id}
              <Copy className="w-3 h-3" />
            </span>
            <CardTitle className="text-xl leading-tight">{software.name}</CardTitle>
            {software.link_status === 'broken' && (
              <Badge variant="destructive" className="w-max text-[10px] py-0 px-1.5">
                {t.link_broken}
              </Badge>
            )}
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{software.version}</Badge>
              <span className="text-xs">{software.size}</span>
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            onClick={toggleFavorite} 
            className={isFavorite ? "text-red-500" : "text-muted-foreground"}
          >
            <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{software.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.isArray(software.platforms) && software.platforms.map(p => (
            <Badge key={p} variant="outline" className="flex items-center gap-1">
              <PlatformIcon platform={p} />
              {p}
            </Badge>
          ))}
          {software.tags && software.tags.map(tag => (
            <Badge key={tag.name} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
              {tag.name}
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
        <Button onClick={(e) => { e.stopPropagation(); onDownload(software.id); }} className="w-full gap-2">
          <Download className="w-4 h-4" />
          {t.download}
        </Button>
      </CardFooter>
    </Card>
  );
});
