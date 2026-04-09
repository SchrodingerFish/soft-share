import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Software, SoftwareCard } from "./SoftwareCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { History, Bell, Download, CheckCircle, ArrowLeft, Trash2, CheckCheck, Settings, Cpu, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";

export const UserCenter: React.FC<{ onBack: () => void; onDetail: (id: number) => void; onDownload: (id: number) => void }> = ({ onBack, onDetail, onDownload }) => {
  const { lang, aiConfig, setAIConfig } = useAppStore();
  const { setUnreadCount, unreadCount, user, setUser } = useAuthStore();
  const t = translations[lang];
  
  const [activeTab, setActiveTab] = useState<"profile" | "history" | "notifications" | "settings">("profile");
  const [history, setHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [localAIConfig, setLocalAIConfig] = useState(aiConfig);
  const [profileData, setProfileData] = useState({ username: user?.username || "", email: user?.email || "" });

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any[]>("/user/history");
      if (res.code === 0) setHistory(res.data);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ items: any[], unreadCount: number }>("/user/notifications");
      if (res.code === 0) {
        setNotifications(res.data.items);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadHistory();
    else if (activeTab === "notifications") loadNotifications();
    else setLoading(false);
  }, [activeTab]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetchApi(`/user/notifications/${id}/read`, { method: "POST" });
      if (res.code === 0) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetchApi("/user/notifications/read-all", { method: "POST" });
      if (res.code === 0) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
        toast.success(t.all_read_success || "All notifications marked as read");
      }
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleSaveAIConfig = () => {
    setAIConfig(localAIConfig);
    toast.success(t.settings_saved);
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetchApi("/user/profile", {
        method: "POST",
        body: JSON.stringify(profileData)
      });
      if (res.code === 0) {
        setUser({ ...user!, ...profileData });
        toast.success(t.profile_saved);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchApi(`/user/notifications/${id}`, { method: "DELETE" });
      if (res.code === 0) {
        const wasUnread = notifications.find(n => n.id === id)?.is_read === 0;
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (wasUnread) setUnreadCount(Math.max(0, unreadCount - 1));
        toast.success("Notification deleted");
      }
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.back_to_list}
          </Button>
          <h2 className="text-2xl font-bold">{t.personal_center}</h2>
        </div>
        <div className="flex bg-muted p-1 rounded-xl">
          <Button 
            variant={activeTab === "profile" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("profile")}
            className="rounded-lg gap-2"
          >
            <User className="h-4 w-4" />
            {t.profile_settings || "Profile"}
          </Button>
          <Button 
            variant={activeTab === "history" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("history")}
            className="rounded-lg gap-2"
          >
            <History className="h-4 w-4" />
            {t.download_history || "Download History"}
          </Button>
          <Button 
            variant={activeTab === "notifications" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("notifications")}
            className="rounded-lg gap-2"
          >
            <Bell className="h-4 w-4" />
            {t.notifications || "Notifications"}
            {unreadCount > 0 && (
              <span className="h-2 w-2 bg-red-500 rounded-full" />
            )}
          </Button>
          <Button 
            variant={activeTab === "settings" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("settings")}
            className="rounded-lg gap-2"
          >
            <Settings className="h-4 w-4" />
            {t.ai_settings || "AI Settings"}
          </Button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "profile" ? (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto bg-card border rounded-2xl p-8 shadow-xl space-y-6"
              >
                <div className="flex items-center gap-3 text-primary mb-2">
                  <User className="h-6 w-6" />
                  <h3 className="text-xl font-bold">{t.profile_settings}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.username}</label>
                    <Input 
                      value={profileData.username}
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.email}</label>
                    <Input 
                      type="email"
                      placeholder="your@email.com"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>

                  <Button className="w-full mt-6" onClick={handleSaveProfile}>
                    {t.save_profile}
                  </Button>
                </div>
              </motion.div>
            ) : activeTab === "history" ? (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {history.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-muted-foreground italic">
                    {t.no_history || "No download history yet"}
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} onClick={() => onDetail(item.id)} className="cursor-pointer relative group">
                      <SoftwareCard software={item} onDownload={onDownload} />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                          {new Date(item.download_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : activeTab === "notifications" ? (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 max-w-3xl mx-auto"
              >
                {notifications.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="gap-2">
                      <CheckCheck className="h-4 w-4" />
                      {t.mark_all_read || "Mark all as read"}
                    </Button>
                  </div>
                )}
                {notifications.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground italic">
                    {t.no_notifications || "No notifications yet"}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-xl border transition-all relative group ${n.is_read ? 'bg-card opacity-70' : 'bg-primary/5 border-primary/20 shadow-sm'}`}
                      onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-3">
                          <div className={`mt-1 p-2 rounded-full ${n.type === 'update' ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'}`}>
                            {n.type === 'update' ? <Download className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                          </div>
                          <div>
                            <h4 className="font-bold">{n.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{n.content}</p>
                            <span className="text-[10px] text-muted-foreground mt-2 block">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!n.is_read && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as read
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteNotification(n.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto bg-card border rounded-2xl p-8 shadow-xl space-y-6"
              >
                <div className="flex items-center gap-3 text-primary mb-2">
                  <Cpu className="h-6 w-6" />
                  <h3 className="text-xl font-bold">{t.ai_settings}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.ai_provider}</label>
                    <Select 
                      value={localAIConfig.provider} 
                      onValueChange={(v: any) => setLocalAIConfig({...localAIConfig, provider: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini (Default)</SelectItem>
                        <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                        <SelectItem value="qwen">Aliyun Qwen (OpenAI Compatible)</SelectItem>
                        <SelectItem value="custom">Custom Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.api_key}</label>
                    <Input 
                      type="password"
                      placeholder="Enter your API Key"
                      value={localAIConfig.apiKey || ""}
                      onChange={(e) => setLocalAIConfig({...localAIConfig, apiKey: e.target.value})}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {localAIConfig.provider === 'gemini' ? "Leave empty to use system default Gemini key." : "Required for non-Gemini providers."}
                    </p>
                  </div>

                  {(localAIConfig.provider === 'custom' || localAIConfig.provider === 'qwen') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t.base_url}</label>
                      <Input 
                        placeholder="https://api.example.com/v1"
                        value={localAIConfig.baseUrl || ""}
                        onChange={(e) => setLocalAIConfig({...localAIConfig, baseUrl: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.ai_model}</label>
                    <Input 
                      placeholder={localAIConfig.provider === 'gemini' ? "gemini-3-flash-preview" : "gpt-4o"}
                      value={localAIConfig.model || ""}
                      onChange={(e) => setLocalAIConfig({...localAIConfig, model: e.target.value})}
                    />
                  </div>

                  <Button className="w-full mt-6" onClick={handleSaveAIConfig}>
                    {t.save_settings}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
