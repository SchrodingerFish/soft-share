import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore, useAuthStore } from "./store";
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useDebounce } from './lib/hooks/useDebounce';
import { useNotifications } from './lib/hooks/useNotifications';
import { translations } from "./i18n";
import { fetchApi } from "./lib/api";
import { Software, SoftwareCard } from "./components/SoftwareCard";
import { SoftwareSkeleton } from "./components/SoftwareSkeleton";
import { SoftwareDetail } from "./components/SoftwareDetail";
import { CollectionsView } from "./components/CollectionsView";
import { AdminDashboard } from "./components/AdminDashboard";
import { AIAssistant } from "./components/AIAssistant";
import { SoftwareComparison } from "./components/SoftwareComparison";
import { SoftwareSubmission } from "./components/SoftwareSubmission";
import { Rankings } from "./components/Rankings";
import { UserCenter } from "./components/UserCenter";
import { Recommendations } from "./components/Recommendations";
import { AuthModal } from "./components/AuthModal";
import { DownloadModal } from "./components/DownloadModal";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationFirst, PaginationLast } from "./components/ui/pagination";
import { Moon, Sun, Globe, Search, User, LogOut, Heart, Filter, Sparkles, Scale, Plus, Bell } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { io } from "socket.io-client";

const PLATFORMS = ["Windows", "macOS", "Android"];

const SoftwareGrid = React.memo(({ 
  items, 
  showFavorites, 
  onDownload, 
  onDetail,
  onSelect,
  selectedIds,
  noDataText,
  isLoading
}: { 
  items: Software[], 
  showFavorites: boolean, 
  onDownload: (id: number) => void,
  onDetail?: (id: number) => void,
  onSelect?: (id: number) => void,
  selectedIds?: number[],
  noDataText: string,
  isLoading?: boolean
}) => {
  const favoriteIds = useAuthStore(state => state.favoriteIds);
  
  const displayedItems = React.useMemo(() => {
    if (!showFavorites) return items;
    return items.filter(s => favoriteIds.includes(s.id));
  }, [items, showFavorites, favoriteIds]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => <SoftwareSkeleton key={i} />)}
      </div>
    );
  }

  if (displayedItems.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {noDataText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {displayedItems.map(software => (
        <div key={software.id} onClick={() => onDetail?.(software.id)} className="cursor-pointer">
          <SoftwareCard 
            software={{
              ...software,
              isSelected: selectedIds?.includes(software.id),
              onSelect: onSelect
            }} 
            onDownload={onDownload} 
          />
        </div>
      ))}
    </div>
  );
});

export default function App() {
  const theme = useAppStore(state => state.theme);
  const lang = useAppStore(state => state.lang);
  const setTheme = useAppStore(state => state.setTheme);
  const setLang = useAppStore(state => state.setLang);
  const setCategories = useAppStore(state => state.setCategories);

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const setFavoriteIds = useAuthStore(state => state.setFavoriteIds);
  const unreadCount = useAuthStore(state => state.unreadCount);
  const setUnreadCount = useAuthStore(state => state.setUnreadCount);

  // Initialize notifications hook
  useNotifications(user?.id);

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
  const showAdmin = searchParams.get("admin") === "true";
  const showCollections = searchParams.get("collections") === "true";
  const showAI = searchParams.get("ai") === "true";
  const showRankings = searchParams.get("rankings") === "true";
  const showSubmit = searchParams.get("submit") === "true";
  const showUserCenter = searchParams.get("user") === "true";
  const compareIds = searchParams.get("compare")?.split(",").map(Number) || [];
  const detailId = searchParams.get("detail");

  const [localSearch, setLocalSearch] = useState(search);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>(compareIds);

  useEffect(() => {
    setSelectedForCompare(compareIds);
  }, [searchParams.get("compare")]);

  const handleSelectForCompare = useCallback((id: number) => {
    setSelectedForCompare(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      if (next.length > 2) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetchApi<{ id: number; name: string; name_en: string; description: string }[]>("/categories");
      if (res.code !== 0) throw new Error(res.message || "Failed to fetch categories");
      return res.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 // 24 hours
  });

  useEffect(() => {
    if (categories.length > 0) {
      setCategories(categories);
    }
  }, [categories, setCategories]);

  useEffect(() => {
    if (user) {
      fetchApi<Software[]>("/favorites").then(res => {
        if (res.code === 0) {
          setFavoriteIds(res.data.map(s => s.id));
        }
      });
      
      // Fetch unread count
      fetchApi<{ items: any[], unreadCount: number }>("/user/notifications").then(res => {
        if (res.code === 0) {
          setUnreadCount(res.data.unreadCount);
        }
      });
    }
  }, [user, setFavoriteIds, setUnreadCount]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || (key === "page" && value === "1") || (key === "limit" && value === "20") || (key === "favorites" && value === "false") || (key === "admin" && value === "false") || (key === "collections" && value === "false")) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    });
  }, [setSearchParams]);

  const debouncedSearch = useDebounce(localSearch, 500);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateParams({ search: debouncedSearch, page: "1", favorites: null });
    }
  }, [debouncedSearch, search, updateParams]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedSoftwareId, setSelectedSoftwareId] = useState<number | null>(null);

  const { ref: loadMoreRef, inView } = useInView();

  const { 
    data: softwareData, 
    isLoading: isSoftwareLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['software', limit, search, category, platform, showFavorites, user],
    queryFn: async ({ pageParam = 1 }) => {
      if (showFavorites) {
        if (!user) return { items: [], total: 0, nextPage: undefined };
        const res = await fetchApi<Software[]>("/favorites");
        if (res.code !== 0) throw new Error(res.message || "Failed to load favorites");
        return { items: res.data, total: res.data.length, nextPage: undefined };
      } else {
        const res = await fetchApi<{ items: Software[], total: number }>(
          `/software?page=${pageParam}&limit=${limit}&search=${search}&category=${category}&platform=${platform}`
        );
        if (res.code !== 0) throw new Error(res.message || "Failed to load software list");
        const hasMore = pageParam * limit < res.data.total;
        return { ...res.data, nextPage: hasMore ? pageParam + 1 : undefined };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: !showAdmin && !showCollections && !detailId && !showAI && !showRankings && !showSubmit && !showUserCenter && compareIds.length < 2
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (softwareData) {
      const allItems = softwareData.pages.flatMap(page => page.items);
      setSoftwareList(allItems);
      setTotal(softwareData.pages[0]?.total || 0);
    }
  }, [softwareData]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Sync softwareList with favorites when in "showFavorites" mode
  useEffect(() => {
    if (showFavorites && user && softwareList.length === 0) {
      // Data is handled by react-query, no need for manual loadData
    }
  }, [showFavorites, user]);

  const handleDownload = useCallback((id: number) => {
    setSelectedSoftwareId(id);
    setDownloadModalOpen(true);
  }, []);

  const handleViewDetail = useCallback((id: number) => {
    updateParams({ 
      detail: id.toString(), 
      favorites: null, 
      admin: null, 
      collections: null,
      rankings: null,
      ai: null,
      submit: null,
      user: null,
      compare: null
    });
  }, [updateParams]);

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
          {categories.map(c => (
            <Button key={c.name} variant={category === c.name ? "default" : "ghost"} className="w-full justify-start" onClick={() => updateParams({ category: c.name, page: "1" })}>
              {lang === 'zh' ? c.name : (c.name_en || c.name)}
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
            <h1 className="text-2xl font-bold tracking-tight text-primary cursor-pointer whitespace-nowrap" onClick={() => updateParams({ favorites: null, admin: null, collections: null, detail: null, search: null, category: null, platform: null, page: null, ai: null, compare: null })}>
              {t.app_name}
            </h1>
            <div className="hidden md:flex items-center gap-4 ml-4 lg:ml-8">
              <Button variant={!showCollections && !showFavorites && !showAdmin && !detailId && !showAI && !showRankings && !showSubmit && compareIds.length < 2 ? "secondary" : "ghost"} onClick={() => updateParams({ collections: null, favorites: null, admin: null, detail: null, ai: null, compare: null, rankings: null, submit: null })}>
                {t.all}
              </Button>
              <Button variant={showCollections ? "secondary" : "ghost"} onClick={() => updateParams({ collections: "true", favorites: null, admin: null, detail: null, ai: null, compare: null, rankings: null, submit: null })}>
                {t.collections}
              </Button>
              <Button variant={showRankings ? "secondary" : "ghost"} onClick={() => updateParams({ rankings: "true", collections: null, favorites: null, admin: null, detail: null, ai: null, compare: null, submit: null })}>
                {t.rankings}
              </Button>
              <Button variant={showAI ? "secondary" : "ghost"} onClick={() => updateParams({ ai: "true", collections: null, favorites: null, admin: null, detail: null, compare: null, rankings: null, submit: null })}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t.ai_assistant}
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t.search_placeholder}
                  className="pl-8 bg-muted/50 border-none focus-visible:ring-1"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateParams({ search: localSearch, page: "1" })}
                />
              </div>
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
            
            {user && (
              <Button variant="ghost" size="icon" className="relative" onClick={() => updateParams({ user: "true", admin: null, favorites: null, collections: null, detail: null, ai: null, rankings: null, submit: null, compare: null })}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-[10px] text-white rounded-full flex items-center justify-center font-bold border-2 border-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            )}

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
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="hidden sm:flex gap-2" onClick={() => updateParams({ submit: "true", admin: null, favorites: null, collections: null, detail: null, ai: null, rankings: null, compare: null })}>
                  <Plus className="h-4 w-4" />
                  {t.submit_software}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" className="gap-2" />}>
                    <User className="h-4 w-4" />
                    {user.username}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => updateParams({ admin: "true", favorites: null, collections: null, detail: null, page: "1", ai: null, rankings: null, submit: null, user: null })}>
                        <Filter className="mr-2 h-4 w-4" />
                        {t.admin_panel}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => updateParams({ user: "true", admin: null, favorites: null, collections: null, detail: null, page: "1", ai: null, rankings: null, submit: null })}>
                      <User className="mr-2 h-4 w-4" />
                      {t.personal_center}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateParams({ favorites: "true", admin: null, collections: null, detail: null, page: "1", ai: null, rankings: null, submit: null, user: null })}>
                      <Heart className="mr-2 h-4 w-4" />
                      {t.favorites}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { logout(); updateParams({ favorites: null, admin: null, collections: null, detail: null, ai: null, rankings: null, submit: null, user: null }); }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.logout}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)}>{t.login}</Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar Filters */}
        {!showFavorites && !showAdmin && !showCollections && !detailId && !showAI && !showRankings && !showSubmit && !showUserCenter && compareIds.length < 2 && (
          <aside className="hidden md:block w-64 flex-shrink-0">
            <SidebarFilters />
          </aside>
        )}

        {/* Content Area */}
        <div className="flex-1">
          {showAdmin ? (
            <AdminDashboard />
          ) : showCollections ? (
            <CollectionsView onDownload={handleDownload} />
          ) : showAI ? (
            <AIAssistant onDownload={handleDownload} />
          ) : showRankings ? (
            <Rankings onSelect={handleViewDetail} />
          ) : showSubmit ? (
            <SoftwareSubmission onBack={() => updateParams({ submit: null })} />
          ) : showUserCenter ? (
            <UserCenter onBack={() => updateParams({ user: null })} onDetail={handleViewDetail} onDownload={handleDownload} />
          ) : compareIds.length === 2 ? (
            <SoftwareComparison 
              softwareA={softwareList.find(s => s.id === compareIds[0]) || softwareList[0]} 
              softwareB={softwareList.find(s => s.id === compareIds[1]) || softwareList[1]} 
              onBack={() => updateParams({ compare: null })}
            />
          ) : detailId ? (
            <SoftwareDetail id={parseInt(detailId)} onBack={() => updateParams({ detail: null })} onDownload={handleDownload} onDetail={handleViewDetail} />
          ) : (
            <>
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
                    {showFavorites ? t.favorites : (category || platform || search ? t.search_results : t.all_software)}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  {selectedForCompare.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-primary text-primary"
                      disabled={selectedForCompare.length !== 2}
                      onClick={() => updateParams({ compare: selectedForCompare.join(",") })}
                    >
                      <Scale className="h-4 w-4" />
                      {t.compare} ({selectedForCompare.length}/2)
                    </Button>
                  )}
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
              </div>

              <SoftwareGrid 
                items={softwareList} 
                showFavorites={showFavorites} 
                onDownload={handleDownload} 
                onDetail={handleViewDetail}
                onSelect={handleSelectForCompare}
                selectedIds={selectedForCompare}
                noDataText={t.no_data}
                isLoading={isSoftwareLoading}
              />

              {!showFavorites && !category && !platform && !search && page === 1 && (
                <Recommendations onDownload={handleDownload} onDetail={handleViewDetail} />
              )}
              {/* Infinite Scroll Loader */}
              {!showFavorites && (
                <div ref={loadMoreRef} className="mt-12 flex justify-center py-8">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading more...
                    </div>
                  ) : hasNextPage ? (
                    <div className="text-muted-foreground text-sm">Scroll for more</div>
                  ) : softwareList.length > 0 ? (
                    <div className="text-muted-foreground text-sm">No more software to load</div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{t.app_name}</span>
            <span>&copy; {new Date().getFullYear()} {t.all_rights_reserved}</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">{t.privacy_policy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t.terms_of_service}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t.contact_us}</a>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <DownloadModal softwareId={selectedSoftwareId} isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
      <Toaster />
    </div>
  );
}
