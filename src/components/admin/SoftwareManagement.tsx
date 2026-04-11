import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../../store";
import { translations } from "../../i18n";
import { fetchApi } from "../../lib/api";
import { Software } from "../SoftwareCard";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Plus, Edit2, Trash2, X, Save, Search, RefreshCw, CheckCircle, AlertCircle, Sparkles, Loader2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { aiService } from "../../services/aiService";
import MDEditor from '@uiw/react-md-editor';

interface Tag {
  id: number;
  name: string;
  name_en: string;
  color: string;
}

export const SoftwareManagement: React.FC = () => {
  const { lang, theme, categories } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentSoftware, setCurrentSoftware] = useState<Partial<Software>>({});
  const [loading, setLoading] = useState(false);

  const fetchSoftware = async () => {
    const res = await fetchApi<{ items: Software[] }>(`/software?limit=100&search=${search}`);
    if (res.code === 0) {
      setSoftwareList(res.data.items);
    }
  };

  const fetchTags = async () => {
    const res = await fetchApi<Tag[]>("/admin/tags", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setAllTags(res.data);
    }
  };

  useEffect(() => {
    fetchSoftware();
    fetchTags();
  }, [search]);

  const triggerLinkCheck = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/software/check-links", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.code === 0) {
        toast.success("Link check started in background");
        setTimeout(fetchSoftware, 2000);
      }
    } catch (err) {
      // Error handled by fetchApi
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentSoftware.name || !currentSoftware.download_url) {
      toast.error("Name and Download URL are required");
      return;
    }

    setLoading(true);
    try {
      const method = currentSoftware.id ? "PUT" : "POST";
      const url = currentSoftware.id ? `/software/${currentSoftware.id}` : "/software";
      
      const res = await fetchApi(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentSoftware)
      });

      if (res.code === 0) {
        toast.success(t.save_success);
        setIsEditing(false);
        fetchSoftware();
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
      const res = await fetchApi(`/software/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.code === 0) {
        toast.success("Deleted successfully");
        fetchSoftware();
      }
    } catch (err) {
      // Error handled by fetchApi
    }
  };

  const openEdit = (item?: any) => {
    if (item) {
      setCurrentSoftware({ ...item });
    } else {
      setCurrentSoftware({
        name: "",
        version: "",
        platforms: ["Windows"],
        category: categories.length > 0 ? categories[0].name : "Dev",
        size: "",
        update_date: new Date().toISOString().split('T')[0],
        description: "",
        screenshots: [],
        popularity: 0,
        download_url: "",
        version_history: [],
        tutorial: "",
        tags: []
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t.search_placeholder} 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={triggerLinkCheck} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t.link_check}
          </Button>
          <Button onClick={() => openEdit()}>
            <Plus className="mr-2 h-4 w-4" />
            {t.add_software}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.software_name}</th>
              <th className="px-4 py-3 text-left font-medium">{t.categories}</th>
              <th className="px-4 py-3 text-left font-medium">{t.tags || "Tags"}</th>
              <th className="px-4 py-3 text-left font-medium">{t.version}</th>
              <th className="px-4 py-3 text-left font-medium">{t.status}</th>
              <th className="px-4 py-3 text-right font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {softwareList.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lang === 'en' && s.category_en ? s.category_en : s.category}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(s.tags) && s.tags.map(tag => (
                      <Badge key={tag.name} variant="outline" style={{ borderColor: tag.color, color: tag.color, fontSize: '10px' }}>
                        {lang === 'en' && tag.name_en ? tag.name_en : tag.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.version}</td>
                <td className="px-4 py-3">
                  {s.link_status === 'broken' ? (
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {t.broken}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-500 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {t.valid}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
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
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4" data-color-mode={theme}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {currentSoftware.id ? t.edit_software : t.add_software}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.software_name}</label>
                <div className="flex gap-2">
                  <Input 
                    value={currentSoftware.name || ""} 
                    onChange={(e) => setCurrentSoftware({...currentSoftware, name: e.target.value})}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      if (!currentSoftware.name) return toast.error("Please enter a name first");
                      setLoading(true);
                      try {
                        const details = await aiService.generateSoftwareDetails(currentSoftware.name, lang);
                        setCurrentSoftware({
                          ...currentSoftware,
                          description: details.description,
                          category: details.category,
                          tutorial: details.tutorial
                        });
                        toast.success("AI generated details successfully!");
                      } catch (err) {
                        toast.error("AI generation failed");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {t.ai_generate}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.version}</label>
                <Input 
                  value={currentSoftware.version || ""} 
                  onChange={(e) => setCurrentSoftware({...currentSoftware, version: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.categories}</label>
                <Select 
                  value={currentSoftware.category} 
                  onValueChange={(v) => setCurrentSoftware({...currentSoftware, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{c.name}</span>
                          {c.name_en && (
                            <span className="text-xs text-muted-foreground">({c.name_en})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.size}</label>
                <Input 
                  value={currentSoftware.size || ""} 
                  onChange={(e) => setCurrentSoftware({...currentSoftware, size: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.update_date}</label>
                <Input 
                  type="date"
                  value={currentSoftware.update_date || ""} 
                  onChange={(e) => setCurrentSoftware({...currentSoftware, update_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.popularity}</label>
                <Input 
                  type="number"
                  value={currentSoftware.popularity ?? 0} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setCurrentSoftware({...currentSoftware, popularity: isNaN(val) ? 0 : val});
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.tags || "Tags"}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.isArray(currentSoftware.tags) && currentSoftware.tags.map((tag, index) => tag && (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    style={{ 
                      borderColor: `${tag.color}40`, 
                      color: tag.color,
                      backgroundColor: `${tag.color}10`
                    }}
                    className="flex items-center gap-1.5 py-1 px-2"
                  >
                    <span className="text-xs font-medium">
                      {lang === 'zh' ? tag.name : (tag.name_en || tag.name)}
                    </span>
                    <button
                      type="button"
                      className="hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        const newTags = [...(currentSoftware.tags || [])];
                        newTags.splice(index, 1);
                        setCurrentSoftware({...currentSoftware, tags: newTags});
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select 
                  onValueChange={(tagName) => {
                    const tag = allTags.find(at => at.name === tagName);
                    if (tag && !currentSoftware.tags?.some(t => t.name === tag.name)) {
                      setCurrentSoftware({
                        ...currentSoftware,
                        tags: [...(currentSoftware.tags || []), { name: tag.name, name_en: tag.name_en, color: tag.color }]
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select existing tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTags.map(tag => tag && (
                      <SelectItem key={tag.id} value={tag.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          <div className="flex flex-col">
                            <span className="text-sm">{tag.name}</span>
                            {tag.name_en && <span className="text-[10px] text-muted-foreground">{tag.name_en}</span>}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex-1 flex gap-2 border rounded-md p-1 bg-muted/30">
                  <Input 
                    placeholder="New tag name (ZH)" 
                    className="h-8 text-xs"
                    id="new-tag-name"
                  />
                  <Input 
                    placeholder="New tag name (EN)" 
                    className="h-8 text-xs"
                    id="new-tag-name-en"
                  />
                  <Input 
                    type="color" 
                    className="w-8 h-8 p-0 border-none bg-transparent"
                    id="new-tag-color"
                    defaultValue="#808080"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2"
                    onClick={() => {
                      const nameInput = document.getElementById('new-tag-name') as HTMLInputElement;
                      const nameEnInput = document.getElementById('new-tag-name-en') as HTMLInputElement;
                      const colorInput = document.getElementById('new-tag-color') as HTMLInputElement;
                      if (nameInput.value) {
                        if (!currentSoftware.tags?.some(t => t.name === nameInput.value)) {
                          setCurrentSoftware({
                            ...currentSoftware,
                            tags: [...(currentSoftware.tags || []), { 
                              name: nameInput.value, 
                              name_en: nameEnInput.value || nameInput.value, 
                              color: colorInput.value 
                            }]
                          });
                        }
                        nameInput.value = "";
                        nameEnInput.value = "";
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.platforms_list}</label>
              <Input 
                value={JSON.stringify(currentSoftware.platforms)} 
                onChange={(e) => {
                  try {
                    setCurrentSoftware({...currentSoftware, platforms: JSON.parse(e.target.value)});
                  } catch (err) {}
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.screenshots_urls}</label>
              <Input 
                value={JSON.stringify(currentSoftware.screenshots)} 
                onChange={(e) => {
                  try {
                    setCurrentSoftware({...currentSoftware, screenshots: JSON.parse(e.target.value)});
                  } catch (err) {}
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.download_url}</label>
              <Input 
                value={currentSoftware.download_url || ""} 
                onChange={(e) => setCurrentSoftware({...currentSoftware, download_url: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.description}</label>
              <MDEditor
                value={currentSoftware.description || ""}
                onChange={(val) => setCurrentSoftware({...currentSoftware, description: val || ""})}
                preview="edit"
                height={200}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.version_history} (JSON)</label>
              <Textarea 
                rows={3}
                value={JSON.stringify(currentSoftware.version_history || [])} 
                onChange={(e) => {
                  try {
                    setCurrentSoftware({...currentSoftware, version_history: JSON.parse(e.target.value)});
                  } catch (err) {}
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.tutorial} (Markdown)</label>
              <MDEditor
                value={currentSoftware.tutorial || ""}
                onChange={(val) => setCurrentSoftware({...currentSoftware, tutorial: val || ""})}
                preview="edit"
                height={300}
              />
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
