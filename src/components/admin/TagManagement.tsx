import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../../store";
import { translations } from "../../i18n";
import { fetchApi } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";

interface Tag {
  id: number;
  name: string;
  name_en: string;
  color: string;
}

export const TagManagement: React.FC = () => {
  const { lang } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTag, setCurrentTag] = useState<Partial<Tag>>({});
  const [loading, setLoading] = useState(false);

  const fetchTags = async () => {
    const res = await fetchApi<Tag[]>("/admin/tags", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setTags(res.data);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSave = async () => {
    if (!currentTag.name) {
      toast.error(t.tag_name + " is required");
      return;
    }

    setLoading(true);
    try {
      const method = currentTag.id ? "PUT" : "POST";
      const url = currentTag.id ? `/admin/tags/${currentTag.id}` : "/admin/tags";
      
      const res = await fetchApi(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentTag)
      });

      if (res.code === 0) {
        toast.success(t.save_success);
        setIsEditing(false);
        fetchTags();
      }
    } catch (err) {
      // Error handled by fetchApi
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t.delete_tag_confirm)) return;

    try {
      const res = await fetchApi(`/admin/tags/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.code === 0) {
        toast.success(t.success);
        fetchTags();
      }
    } catch (err) {
      // Error handled by fetchApi
    }
  };

  const openEdit = (item?: Tag) => {
    if (item) {
      setCurrentTag({ ...item });
    } else {
      setCurrentTag({
        name: "",
        color: "gray"
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openEdit()}>
          <Plus className="mr-2 h-4 w-4" />
          {t.add_tag}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.tag_name} (ZH)</th>
              <th className="px-4 py-3 text-left font-medium">{t.tag_name} (EN)</th>
              <th className="px-4 py-3 text-left font-medium">{t.tag_color}</th>
              <th className="px-4 py-3 text-right font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tags.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.name_en}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.color}
                  </div>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
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
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {currentTag.id ? t.edit_tag : t.add_tag}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.tag_name} (ZH)</label>
                <Input 
                  value={currentTag.name || ""} 
                  onChange={(e) => setCurrentTag({...currentTag, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.tag_name} (EN)</label>
                <Input 
                  value={currentTag.name_en || ""} 
                  onChange={(e) => setCurrentTag({...currentTag, name_en: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.tag_color}</label>
                <Input 
                  type="color"
                  value={currentTag.color || "#808080"} 
                  onChange={(e) => setCurrentTag({...currentTag, color: e.target.value})}
                  className="h-10 p-1"
                />
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
