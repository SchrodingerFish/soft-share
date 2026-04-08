import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore, useAuthStore } from "./store";
import { translations } from "./i18n";
import { fetchApi } from "./lib/api";
import { Software, SoftwareCard } from "./components/SoftwareCard";
import { AuthModal } from "./components/AuthModal";
import { DownloadModal } from "./components/DownloadModal";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./components/ui/pagination";
import { Moon, Sun, Globe, Search, User, LogOut, Heart, Filter } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const CATEGORIES = ["Dev", "System", "Download", "Media", "Productivity", "Design"];
const PLATFORMS = ["Windows", "macOS", "Android"];

export default function App() {
  const { theme, lang, setTheme, setLang } = useAppStore();
  const { user, logout, setFavoriteIds, favoriteIds } = useAuthStore();
  const t = translations[lang];

  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [total, setTotal] = useState(0);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const platform = searchParams.get("platform") || "";
  const showFavorites = searchParams.get("favorites") === "true";

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (user) {
      fetchApi<Software[]>("/favorites").then(res => {
        if (res.code === 0) {
          setFavoriteIds(res.data.map(s => s.id));
        }
      });
    }
  }, [user, setFavoriteIds]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || (key === "page" && value === "1") || (key === "limit" && value === "20") || (key === "favorites" && value === "false")) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    });
  }, [setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        updateParams({ search: localSearch, page: "1", favorites: null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, updateParams]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedSoftwareId, setSelectedSoftwareId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      if (showFavorites) {
        if (!user) return;
        const res = await fetchApi<Software[]>("/favorites");
        if (res.code === 0) {
          setSoftwareList(res.data);
          setTotal(res.data.length);
        } else {
          toast.error(res.message || "Failed to load favorites");
        }
      } else {
        const res = await fetchApi<{ items: Software[], total: number }>(
          `/software?page=${page}&limit=${limit}&search=${search}&category=${category}&platform=${platform}`
        );
        if (res.code === 0) {
          setSoftwareList(res.data.items);
          setTotal(res.data.total);
        } else {
          toast.error(res.message || "Failed to load software list");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred while loading data");
    }
  };

  useEffect(() => {
    // Only reload data when search/filters/page change, or when toggling showFavorites
    // We remove 'user' and 'favoriteIds' from here to prevent re-fetching the whole list on every toggle
    loadData();
  }, [page, limit, search, category, platform, showFavorites]);

  const totalPages = Math.ceil(total / limit) || 1;

  const displayedSoftware = showFavorites 
    ? softwareList.filter(s => favoriteIds.includes(s.id))
    : softwareList;

  // Sync softwareList with favorites when in "showFavorites" mode and favoriteIds change
  // but only if we are not already fetching
  useEffect(() => {
    if (showFavorites && user) {
      // If we are in favorites view, we want to keep the list in sync with the store
      // but without a full API reload if possible.
      // However, if the list is empty and we have favoriteIds, we should fetch.
      if (softwareList.length === 0 && favoriteIds.length > 0) {
        loadData();
      }
    }
  }, [showFavorites, user]);

  const handleDownload = (id: number) => {
    setSelectedSoftwareId(id);
    setDownloadModalOpen(true);
  };

  const SidebarFilters = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-4 text-lg">{t.platforms}</h3>
        <div className="space-y-2">
          <Button variant={platform === "" ? "default" : "ghost"} className="w-full justify-start" onClick={() => updateParams({ platform: null, page: "1" })}>
            {t.all}
          </Button>
          {PLATFORMS.map(p => (
            <Button key={p} variant={platform === p ? "default" : "ghost"} className="w-full justify-start" onClick={() => updateParams({ platform: p, page: "1" })}>
              {p}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-4 text-lg">{t.categories}</h3>
        <div className="space-y-2">
          <Button variant={category === "" ? "default" : "ghost"} className="w-full justify-start" onClick={() => updateParams({ category: null, page: "1" })}>
            {t.all}
          </Button>
          {CATEGORIES.map(c => (
            <Button key={c} variant={category === c ? "default" : "ghost"} className="w-full justify-start" onClick={() => updateParams({ category: c, page: "1" })}>
              {c}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tight text-primary cursor-pointer" onClick={() => updateParams({ favorites: null, search: null, category: null, platform: null, page: null })}>
              {t.app_name}
            </h1>
            <div className="hidden md:flex relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.search_placeholder}
                className="pl-8 bg-muted/50"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            {/* Mobile Search */}
            <div className="flex md:hidden relative flex-1 max-w-[200px] ml-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.search_placeholder}
                className="pl-8 bg-muted/50 h-9"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                <Globe className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('zh')}>中文</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')}>English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" className="gap-2" />}>
                  <User className="h-4 w-4" />
                  {user.username}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => updateParams({ favorites: "true", page: "1" })}>
                    <Heart className="mr-2 h-4 w-4" />
                    {t.favorites}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { logout(); updateParams({ favorites: null }); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)}>{t.login}</Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar Filters */}
        {!showFavorites && (
          <aside className="hidden md:block w-64 flex-shrink-0">
            <SidebarFilters />
          </aside>
        )}

        {/* Content Area */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Trigger */}
              {!showFavorites && (
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" />}>
                    <Filter className="h-4 w-4" />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <SidebarFilters />
                  </SheetContent>
                </Sheet>
              )}
              <h2 className="text-2xl font-bold">
                {showFavorites ? t.favorites : (category || platform || search ? "Search Results" : "All Software")}
              </h2>
            </div>
            {!showFavorites && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t.items_per_page}:</span>
                <Select value={limit.toString()} onValueChange={(v) => updateParams({ limit: v, page: "1" })}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {displayedSoftware.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {t.no_data}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedSoftware.map(software => (
                <SoftwareCard key={software.id} software={software} onDownload={handleDownload} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!showFavorites && totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => updateParams({ page: Math.max(1, page - 1).toString() })} 
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4 text-sm">Page {page} of {totalPages}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => updateParams({ page: Math.min(totalPages, page + 1).toString() })}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{t.app_name}</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <DownloadModal softwareId={selectedSoftwareId} isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
      <Toaster />
    </div>
  );
}
