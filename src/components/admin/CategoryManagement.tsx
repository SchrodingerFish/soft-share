import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../../store";
import { translations } from "../../i18n";
import { fetchApi } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  description: string;
}

export const CategoryManagement: React.FC = () => {
  const { lang } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    const res = await fetchApi<Category[]>("/categories", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setCategories(res.data);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!currentCategory.name) {
      toast.error(t.category_name + " is required");
      return;
    }

    setLoading(true);
    try {
      const method = currentCategory.id ? "PUT" : "POST";
      const url = currentCategory.id ? `/categories/${currentCategory.id}` : "/categories";
      
      const res = await fetchApi(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentCategory)
      });

      if (res.code === 0) {
        toast.success(t.save_success);
        setIsEditing(false);
        fetchCategories();
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
      const res = await fetchApi(`/categories/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.code === 0) {
        toast.success(t.success);
        fetchCategories();
      }
    } catch (err) {
      // Error handled by fetchApi
    }
  };

  const openEdit = (item?: Category) => {
    if (item) {
      setCurrentCategory({ ...item });
    } else {
      setCurrentCategory({
        name: "",
        description: ""
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openEdit()}>
          <Plus className="mr-2 h-4 w-4" />
          {t.add_category}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.category_name}</th>
              <th className="px-4 py-3 text-left font-medium">{t.category_desc}</th>
              <th className="px-4 py-3 text-right font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.description}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
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
                {currentCategory.id ? t.edit_category : t.add_category}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.category_name}</label>
                <Input 
                  value={currentCategory.name || ""} 
                  onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.category_desc}</label>
                <Textarea 
                  value={currentCategory.description || ""} 
                  onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
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
