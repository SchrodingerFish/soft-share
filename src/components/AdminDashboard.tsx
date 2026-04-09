import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Software } from "./SoftwareCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Edit2, Trash2, X, Save, Search, RefreshCw, CheckCircle, AlertCircle, Layers, Package, Sparkles, Loader2, Send, Users, CreditCard, Shield } from "lucide-react";
import { toast } from "sonner";
import { aiService } from "../services/aiService";

const CATEGORIES = ["Dev", "System", "Download", "Media", "Productivity", "Design"];

interface Collection {
  id?: number;
  title: string;
  description: string;
  cover_image: string;
  software_ids: number[];
}

interface Submission {
  id: number;
  user_id: number;
  username: string;
  name: string;
  version: string;
  platforms: string;
  category: string;
  size: string;
  description: string;
  download_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const { lang } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [activeTab, setActiveTab] = useState<"software" | "collections" | "submissions" | "users">("software");
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentSoftware, setCurrentSoftware] = useState<Partial<Software>>({});
  const [currentCollection, setCurrentCollection] = useState<Partial<Collection>>({});
  const [loading, setLoading] = useState(false);
  const [softwareSearch, setSoftwareSearch] = useState("");

  const fetchSoftware = async (searchOverride?: string) => {
    const res = await fetchApi<{ items: Software[] }>(`/software?limit=100&search=${searchOverride !== undefined ? searchOverride : search}`);
    if (res.code === 0) {
      setSoftwareList(res.data.items);
    }
  };

  const fetchCollections = async () => {
    const res = await fetchApi<Collection[]>("/collections");
    if (res.code === 0) {
      setCollections(res.data);
    }
  };

  const fetchSubmissions = async () => {
    const res = await fetchApi<Submission[]>("/submissions", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setSubmissions(res.data);
    }
  };

  const fetchUsers = async () => {
    const res = await fetchApi<any[]>("/admin/users", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setUserList(res.data);
    }
  };

  const triggerLinkCheck = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/software/check-links", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.code === 0) {
        toast.success("Link check started in background");
        setTimeout(fetchSoftware, 2000); // Wait a bit for some updates
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to trigger link check");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "software") fetchSoftware();
    else if (activeTab === "collections") fetchCollections();
    else if (activeTab === "submissions") fetchSubmissions();
    else fetchUsers();
  }, [search, activeTab]);

  const handleSave = async () => {
    if (activeTab === "software") {
      if (!currentSoftware.name || !currentSoftware.download_url) {
        toast.error("Name and Download URL are required");
        return;
      }
    } else {
      if (!currentCollection.title) {
        toast.error("Title is required");
        return;
      }
    }

    setLoading(true);
    try {
      const isSoftware = activeTab === "software";
      const item = isSoftware ? currentSoftware : currentCollection;
      const method = item.id ? "PUT" : "POST";
      const baseUrl = isSoftware ? "/software" : "/collections";
      const url = item.id ? `${baseUrl}/${item.id}` : baseUrl;
      
      const res = await fetchApi(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(item)
      });

      if (res.code === 0) {
        toast.success(t.save_success);
        setIsEditing(false);
        isSoftware ? fetchSoftware() : fetchCollections();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const res = await fetchApi(`/submissions/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.code === 0) {
        toast.success("Status updated");
        fetchSubmissions();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePaidToggle = async (userId: number, currentStatus: boolean | number) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/users/${userId}/paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ is_paid: !currentStatus })
      });
      if (res.code === 0) {
        toast.success("User status updated");
        fetchUsers();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to update user status");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: number, role: string) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/users/${userId}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });
      if (res.code === 0) {
        toast.success("User role updated");
        fetchUsers();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to update user role");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t.delete_confirm)) return;

    try {
      const baseUrl = activeTab === "software" ? "/software" : "/collections";
      const res = await fetchApi(`${baseUrl}/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.code === 0) {
        toast.success("Deleted successfully");
        activeTab === "software" ? fetchSoftware() : fetchCollections();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (item?: any) => {
    if (activeTab === "software") {
      if (item) {
        setCurrentSoftware({ ...item });
      } else {
        setCurrentSoftware({
          name: "",
          version: "",
          platforms: ["Windows"],
          category: "Dev",
          size: "",
          update_date: new Date().toISOString().split('T')[0],
          description: "",
          screenshots: [],
          popularity: 0,
          download_url: "",
          version_history: [],
          tutorial: ""
        });
      }
    } else {
      // Fetch software list to ensure we have items for selection
      fetchSoftware(""); 
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
    }
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{t.admin_panel}</h2>
          <div className="flex bg-muted p-1 rounded-lg">
            <Button 
              variant={activeTab === "software" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab("software")}
            >
              <Package className="mr-2 h-4 w-4" />
              Software
            </Button>
            <Button 
              variant={activeTab === "collections" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab("collections")}
            >
              <Layers className="mr-2 h-4 w-4" />
              Collections
            </Button>
            <Button 
              variant={activeTab === "submissions" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab("submissions")}
            >
              <Send className="mr-2 h-4 w-4" />
              Submissions
            </Button>
            <Button 
              variant={activeTab === "users" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab("users")}
            >
              <Users className="mr-2 h-4 w-4" />
              Users
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === "software" && (
            <Button variant="outline" onClick={triggerLinkCheck} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Check Links
            </Button>
          )}
          <Button onClick={() => openEdit()}>
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "software" ? t.add_software : "Add Collection"}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={t.search_placeholder} 
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            {activeTab === "software" ? (
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t.software_name}</th>
                <th className="px-4 py-3 text-left font-medium">{t.categories}</th>
                <th className="px-4 py-3 text-left font-medium">{t.version}</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            ) : activeTab === "collections" ? (
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t.collection_title}</th>
                <th className="px-4 py-3 text-left font-medium">Items Count</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            ) : activeTab === "submissions" ? (
              <tr>
                <th className="px-4 py-3 text-left font-medium">Software</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            ) : (
              <tr>
                <th className="px-4 py-3 text-left font-medium">Username</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Paid Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y">
            {activeTab === "software" ? (
              softwareList.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.version}</td>
                  <td className="px-4 py-3">
                    {s.link_status === 'broken' ? (
                      <span className="flex items-center gap-1 text-destructive font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Broken
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-500 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Valid
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
              ))
            ) : activeTab === "collections" ? (
              collections.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.software_ids.length} items</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : activeTab === "submissions" ? (
              submissions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.category} | {s.version}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.username}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === 'pending' ? 'secondary' : s.status === 'approved' ? 'outline' : 'destructive'}>
                      {s.status === 'pending' ? t.status_pending : s.status === 'approved' ? t.status_approved : t.status_rejected}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {s.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(s.id, 'approved')}>
                          {t.approve}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleStatusUpdate(s.id, 'rejected')}>
                          {t.reject}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              userList.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || "-"}</td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={(v) => handleRoleUpdate(u.id, v)}>
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_paid ? "default" : "secondary"} className="gap-1">
                      {u.is_paid ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {u.is_paid ? "Paid" : "Free"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePaidToggle(u.id, u.is_paid)}
                      className="gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      {u.is_paid ? "Set as Free" : "Set as Paid"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {activeTab === "software" 
                  ? (currentSoftware.id ? t.edit_software : t.add_software)
                  : (currentCollection.id ? "Edit Collection" : "Add Collection")}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {activeTab === "software" ? (
              <>
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
                            const details = await aiService.generateSoftwareDetails(currentSoftware.name);
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
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
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
                      value={currentSoftware.popularity || 0} 
                      onChange={(e) => setCurrentSoftware({...currentSoftware, popularity: parseInt(e.target.value)})}
                    />
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
                  <Textarea 
                    rows={3}
                    value={currentSoftware.description || ""} 
                    onChange={(e) => setCurrentSoftware({...currentSoftware, description: e.target.value})}
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
                  <Textarea 
                    rows={5}
                    value={currentSoftware.tutorial || ""} 
                    onChange={(e) => setCurrentSoftware({...currentSoftware, tutorial: e.target.value})}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.collection_title}</label>
                  <Input 
                    value={currentCollection.title || ""} 
                    onChange={(e) => setCurrentCollection({...currentCollection, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.collection_desc}</label>
                  <Textarea 
                    rows={3}
                    value={currentCollection.description || ""} 
                    onChange={(e) => setCurrentCollection({...currentCollection, description: e.target.value})}
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
                      {currentCollection.software_ids?.length || 0} selected
                    </span>
                  </label>
                  
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search software to add..." 
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
              </>
            )}

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
