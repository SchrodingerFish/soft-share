import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Software, SoftwareCard } from "./SoftwareCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { History, Bell, Download, CheckCircle, ArrowLeft, Trash2, CheckCheck, Settings, Cpu, User, Lock, Image as ImageIcon, Heart, Send, Menu } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger as SheetTriggerBase } from "./ui/sheet";

export const UserCenter: React.FC<{ onBack: () => void; onDetail: (id: number) => void; onDownload: (id: number) => void }> = ({ onBack, onDetail, onDownload }) => {
  const { lang, aiConfig, setAIConfig } = useAppStore();
  const { setUnreadCount, unreadCount, user, setUser } = useAuthStore();
  const t = translations[lang];
  
  const [activeTab, setActiveTab] = useState<"profile" | "history" | "favorites" | "submissions" | "notifications" | "settings">("profile");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [localAIConfig, setLocalAIConfig] = useState(aiConfig);
  const [profileData, setProfileData] = useState({ 
    username: user?.username || "", 
    email: user?.email || "",
    avatar: user?.avatar || "",
    password: "",
    confirmPassword: ""
  });

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any[]>("/user/history");
      if (res.code === 0) setHistory(res.data);
    } catch (err) {
      toast.error(t.failed_load_history);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any[]>("/user/favorites");
      if (res.code === 0) setFavorites(res.data);
    } catch (err) {
      toast.error(t.failed_load_favorites);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any[]>("/user/submissions");
      if (res.code === 0) setSubmissions(res.data);
    } catch (err) {
      toast.error(t.failed_load_submissions);
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
      toast.error(t.failed_load_notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadHistory();
    else if (activeTab === "favorites") loadFavorites();
    else if (activeTab === "submissions") loadSubmissions();
    else if (activeTab === "notifications") loadNotifications();
    else setLoading(false);
  }, [activeTab]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetchApi(`/user/notifications/${id}/read`, { method: "POST" });
      if (res.code === 0) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        setUnreadCount(Math.max(0, unreadCount - 1));
        
        // Update global state
        useAuthStore.getState().setUnreadCount(Math.max(0, unreadCount - 1));
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
        useAuthStore.getState().setUnreadCount(0);
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
    if (profileData.password && profileData.password !== profileData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await fetchApi("/user/profile", {
        method: "POST",
        body: JSON.stringify({
          username: profileData.username,
          email: profileData.email,
          avatar: profileData.avatar,
          password: profileData.password || undefined
        })
      });
      if (res.code === 0) {
        setUser({ ...user!, username: profileData.username, email: profileData.email, avatar: profileData.avatar });
        setProfileData({ ...profileData, password: "", confirmPassword: "" });
        toast.success(t.profile_saved || "Profile updated successfully");
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

  const menuItems: { id: string, label: string, icon: any, badge?: number }[] = [
    { id: "profile", label: t.profile_settings || "Profile", icon: User },
    { id: "history", label: t.download_history || "History", icon: History },
    { id: "favorites", label: t.favorites || "Favorites", icon: Heart },
    { id: "submissions", label: t.submission || "Submissions", icon: Send },
    { id: "notifications", label: t.notifications || "Notifications", icon: Bell, badge: unreadCount },
    { id: "settings", label: t.ai_settings || "AI Settings", icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col gap-2">
      {menuItems.map((item) => (
        <Button
          key={item.id}
          variant={activeTab === item.id ? "secondary" : "ghost"}
          className="justify-start w-full"
          onClick={() => {
            setActiveTab(item.id as any);
            setIsMobileMenuOpen(false);
          }}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
          {item.badge ? (
            <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t.back_to_list}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Mobile Header & Drawer */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{t.personal_center}</h2>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTriggerBase render={<Button variant="outline" size="icon" />}>
              <Menu className="h-5 w-5" />
            </SheetTriggerBase>
            <SheetContent side="left" className="w-64">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle>{t.personal_center}</SheetTitle>
              </SheetHeader>
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="sticky top-6 space-y-6">
            <h2 className="text-2xl font-bold px-2">{t.personal_center}</h2>
            <div className="bg-muted/50 p-2 rounded-xl">
              <NavContent />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
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
                className="max-w-2xl mx-auto bg-card border rounded-2xl p-8 shadow-xl space-y-8"
              >
                <div className="flex items-center gap-3 text-primary mb-2">
                  <User className="h-6 w-6" />
                  <h3 className="text-xl font-bold">{t.profile_settings}</h3>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 rounded-full border-4 border-muted overflow-hidden bg-muted flex items-center justify-center">
                      {profileData.avatar ? (
                        <img src={profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-16 h-16 text-muted-foreground" />
                      )}
                    </div>
                    <div className="w-full space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Avatar URL
                      </label>
                      <Input 
                        placeholder="https://example.com/avatar.png"
                        value={profileData.avatar}
                        onChange={(e) => setProfileData({...profileData, avatar: e.target.value})}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
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

                    <div className="pt-4 border-t space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Change Password
                      </h4>
                      <div className="space-y-2">
                        <Input 
                          type="password"
                          placeholder="New Password (leave blank to keep current)"
                          value={profileData.password}
                          onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Input 
                          type="password"
                          placeholder="Confirm New Password"
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                        />
                      </div>
                    </div>

                    <Button className="w-full mt-6" onClick={handleSaveProfile}>
                      {t.save_profile}
                    </Button>
                  </div>
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
                  <div className="col-span-full text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                    <History className="h-12 w-12 opacity-20" />
                    <p>{t.no_history || "No download history yet"}</p>
                    <Button variant="link" onClick={() => onBack()}>去发现更多好软件</Button>
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
            ) : activeTab === "favorites" ? (
              <motion.div 
                key="favorites"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {favorites.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                    <Heart className="h-12 w-12 opacity-20" />
                    <p>{t.no_data || "No favorites yet"}</p>
                    <Button variant="link" onClick={() => onBack()}>去发现更多好软件</Button>
                  </div>
                ) : (
                  favorites.map((item) => (
                    <div key={item.id} onClick={() => onDetail(item.id)} className="cursor-pointer relative group">
                      <SoftwareCard software={item} onDownload={onDownload} />
                    </div>
                  ))
                )}
              </motion.div>
            ) : activeTab === "submissions" ? (
              <motion.div 
                key="submissions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {submissions.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground italic">
                    {t.no_data || "No submissions yet"}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">{t.software_name}</th>
                          <th className="px-4 py-3 text-left font-medium">{t.version}</th>
                          <th className="px-4 py-3 text-left font-medium">{t.submission_status}</th>
                          <th className="px-4 py-3 text-left font-medium">{t.update_date}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {submissions.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.version}</td>
                            <td className="px-4 py-3">
                              <Badge variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {s.status === 'pending' ? t.status_pending : s.status === 'approved' ? t.status_approved : t.status_rejected}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(s.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
    </div>
  );
};
