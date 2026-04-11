import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../../store";
import { translations } from "../../i18n";
import { fetchApi } from "../../lib/api";
import { Software } from "../SoftwareCard";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Plus, Edit2, Trash2, X, Save, Search, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Collection {
  id?: number;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  cover_image: string;
  software_ids: number[];
}

export const CollectionManagement: React.FC = () => {
  const { lang } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCollection, setCurrentCollection] = useState<Partial<Collection>>({});
  const [loading, setLoading] = useState(false);
  const [softwareSearch, setSoftwareSearch] = useState("");

  const fetchCollections = async () => {
    const res = await fetchApi<Collection[]>("/collections");
    if (res.code === 0) {
      setCollections(res.data);
    }
  };

  const fetchSoftware = async () => {
    const res = await fetchApi<{ items: Software[] }>(`/software?limit=100`);
    if (res.code === 0) {
      setSoftwareList(res.data.items);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleSave = async () => {
    if (!currentCollection.title) {
      toast.error(t.collection_title + " is required");
      return;
    }

    setLoading(true);
    try {
      const method = currentCollection.id ? "PUT" : "POST";
      const url = currentCollection.id ? `/collections/${currentCollection.id}` : "/collections";
      
      const res = await fetchApi(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentCollection)
      });

      if (res.code === 0) {
        toast.success(t.save_success);
        setIsEditing(false);
        fetchCollections();
      }
    } catch (err) {
      // Error handled by fetchApi
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t.delete_confirm)) return;

    try {
      const res = await fetchApi(`/collections/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.code === 0) {
        toast.success(t.success);
        fetchCollections();
      }
    } catch (err) {
      // Error handled by fetchApi
    }
  };

  const openEdit = (item?: any) => {
    fetchSoftware(); 
    setSoftwareSearch("");
    if (item) {
      setCurrentCollection({ ...item });
    } else {
      setCurrentCollection({
        title: "",
        description: "",
        cover_image: "",
        software_ids: []
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-4">
        <Button onClick={() => openEdit()}>
          <Plus className="mr-2 h-4 w-4" />
          {t.add_collection}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.collection_title} (ZH)</th>
              <th className="px-4 py-3 text-left font-medium">{t.collection_title} (EN)</th>
              <th className="px-4 py-3 text-left font-medium">{t.items_count}</th>
              <th className="px-4 py-3 text-right font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {collections.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.title_en}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.software_ids.length} {t.items_count}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {currentCollection.id ? t.edit_collection : t.add_collection}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.collection_title} (ZH)</label>
              <Input 
                value={currentCollection.title || ""} 
                onChange={(e) => setCurrentCollection({...currentCollection, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.collection_title} (EN)</label>
              <Input 
                value={currentCollection.title_en || ""} 
                onChange={(e) => setCurrentCollection({...currentCollection, title_en: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.collection_desc} (ZH)</label>
              <Textarea 
                rows={2}
                value={currentCollection.description || ""} 
                onChange={(e) => setCurrentCollection({...currentCollection, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.collection_desc} (EN)</label>
              <Textarea 
                rows={2}
                value={currentCollection.description_en || ""} 
                onChange={(e) => setCurrentCollection({...currentCollection, description_en: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.collection_cover}</label>
              <Input 
                value={currentCollection.cover_image || ""} 
                onChange={(e) => setCurrentCollection({...currentCollection, cover_image: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between items-center">
                <span>{t.software_ids}</span>
                <span className="text-xs text-primary font-bold">
                  {currentCollection.software_ids?.length || 0} {t.selected}
                </span>
              </label>
              
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder={t.search_software_to_add} 
                    className="pl-8 h-8 text-xs"
                    value={softwareSearch}
                    onChange={(e) => setSoftwareSearch(e.target.value)}
                  />
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {softwareList
                    .filter(s => s.name.toLowerCase().includes(softwareSearch.toLowerCase()))
                    .map(s => {
                      const isSelected = currentCollection.software_ids?.includes(s.id);
                      return (
                        <div 
                          key={s.id}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => {
                            const ids = currentCollection.software_ids || [];
                            if (isSelected) {
                              setCurrentCollection({
                                ...currentCollection,
                                software_ids: ids.filter(id => id !== s.id)
                              });
                            } else {
                              setCurrentCollection({
                                ...currentCollection,
                                software_ids: [...ids, s.id]
                              });
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                              {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm truncate">{s.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{s.category}</Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t.cancel}</Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {t.submit}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
