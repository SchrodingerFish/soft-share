import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Software, SoftwareCard } from "./SoftwareCard";
import { Button } from "./ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { toast } from "sonner";

interface Collection {
  id: number;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  cover_image: string;
  software_ids: number[];
  items?: Software[];
}

export const CollectionsView: React.FC<{ onDownload: (id: number) => void }> = ({ onDownload }) => {
  const { lang } = useAppStore();
  const t = translations[lang];
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true);
      try {
        const res = await fetchApi<Collection[]>("/collections");
        if (res.code === 0) {
          setCollections(res.data);
        }
      } catch (err) {
        toast.error("Failed to load collections");
      } finally {
        setLoading(false);
      }
    };
    loadCollections();
  }, []);

  const loadCollectionDetail = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetchApi<Collection>(`/collections/${id}`);
      if (res.code === 0) {
        setSelectedCollection(res.data);
        window.scrollTo(0, 0);
      }
    } catch (err) {
      toast.error("Failed to load collection detail");
    } finally {
      setLoading(false);
    }
  };

  if (loading && collections.length === 0) return <div className="py-20 text-center">Loading...</div>;

  if (selectedCollection) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button variant="ghost" onClick={() => setSelectedCollection(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.back_to_list}
        </Button>

        <div className="relative h-64 rounded-2xl overflow-hidden">
          <img src={selectedCollection.cover_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8 text-white">
            <h2 className="text-4xl font-bold mb-2">{lang === 'zh' ? selectedCollection.title : (selectedCollection.title_en || selectedCollection.title)}</h2>
            <p className="text-lg opacity-90 max-w-2xl">{lang === 'zh' ? selectedCollection.description : (selectedCollection.description_en || selectedCollection.description)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {selectedCollection.items?.map(software => (
            <SoftwareCard key={software.id} software={software} onDownload={onDownload} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <h2 className="text-3xl font-bold">{t.collections}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map(c => (
          <div 
            key={c.id} 
            className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all"
            onClick={() => loadCollectionDetail(c.id)}
          >
            <img 
              src={c.cover_image} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{lang === 'zh' ? c.title : (c.title_en || c.title)}</h3>
              <p className="text-sm opacity-80 line-clamp-2">{lang === 'zh' ? c.description : (c.description_en || c.description)}</p>
              <Button variant="link" className="text-white p-0 mt-4 w-max group-hover:translate-x-2 transition-transform">
                {t.view_all} &rarr;
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
