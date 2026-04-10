import React, { useState } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Upload, Send, ArrowLeft } from "lucide-react";

export const SoftwareSubmission: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { lang, categories } = useAppStore();
  const t = translations[lang];
  
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    platforms: ["Windows"],
    category: categories.length > 0 ? categories[0].name : "Dev",
    size: "",
    description: "",
    download_url: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.download_url) {
      return toast.error("Name and Download URL are required");
    }

    setLoading(true);
    try {
      const res = await fetchApi("/submissions", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.code === 0) {
        toast.success(t.submission_success);
        onBack();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold">{t.submit_software}</h2>
          <p className="text-muted-foreground">{t.ai_assistant_desc}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.software_name}</label>
            <Input 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. VS Code"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.version}</label>
            <Input 
              value={formData.version}
              onChange={(e) => setFormData({...formData, version: e.target.value})}
              placeholder="e.g. 1.0.0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.categories}</label>
            <Select 
              value={formData.category}
              onValueChange={(v) => setFormData({...formData, category: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.size}</label>
            <Input 
              value={formData.size}
              onChange={(e) => setFormData({...formData, size: e.target.value})}
              placeholder="e.g. 50 MB"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t.download_url}</label>
          <Input 
            required
            type="url"
            value={formData.download_url}
            onChange={(e) => setFormData({...formData, download_url: e.target.value})}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t.description}</label>
          <Textarea 
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe the software..."
          />
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full h-12 gap-2 text-lg" disabled={loading}>
            {loading ? "Submitting..." : (
              <>
                <Send className="h-5 w-5" />
                {t.submit}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
