import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { Software, SoftwareCard } from "./SoftwareCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Image } from "./ui/Image";
import { Textarea } from "./ui/textarea";
import { Calendar, Download, Flame, Monitor, Smartphone, Apple, ArrowLeft, History, BookOpen, LayoutGrid, ChevronDown, ChevronUp, X, Star, MessageSquare, Send, Sparkles, Shield, Copy } from "lucide-react";
import { toast } from "sonner";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "../store";
import { aiService } from "../services/aiService";
import { Helmet } from "react-helmet-async";

export const SoftwareDetail: React.FC<{ id: number; onBack: () => void; onDownload: (id: number) => void }> = ({ id, onBack, onDownload }) => {
  const { lang } = useAppStore();
  const { user } = useAuthStore();
  const t = translations[lang];
  const [software, setSoftware] = useState<Software | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string; highlights: string[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  const loadComments = async () => {
    const res = await fetchApi<any[]>(`/comments/${id}`);
    if (res.code === 0) setComments(res.data);
  };

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setAiSummary(null);
      setIsAiExpanded(false);
      try {
        const res = await fetchApi<Software>(`/software/${id}`);
        if (res.code === 0) {
          setSoftware(res.data);
        } else {
          toast.error(res.message);
        }
      } catch (err) {
        toast.error("Failed to load software detail");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
    loadComments();
    window.scrollTo(0, 0);
  }, [id]);

  const handleToggleAi = () => {
    if (!isAiExpanded && !aiSummary && !loadingSummary && software) {
      setLoadingSummary(true);
      aiService.summarizeSoftware(software)
        .then(summary => setAiSummary(summary))
        .catch(err => {
          console.error("AI Summary failed:", err);
          toast.error(err.message || "Failed to generate AI summary");
        })
        .finally(() => setLoadingSummary(false));
    }
    setIsAiExpanded(!isAiExpanded);
  };

  const handleSubmitComment = async () => {
    if (!user) return toast.error("Please login first");
    if (!newComment.trim()) return toast.error("Comment cannot be empty");

    setSubmittingComment(true);
    try {
      const res = await fetchApi("/comments", {
        method: "POST",
        body: JSON.stringify({
          software_id: id,
          rating: newRating,
          content: newComment
        })
      });
      if (res.code === 0) {
        toast.success("Comment submitted");
        setNewComment("");
        setNewRating(5);
        loadComments();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <div className="py-20 text-center">Loading...</div>;
  if (!software) return <div className="py-20 text-center">Software not found</div>;

  const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform === "Windows") return <Monitor className="w-4 h-4" />;
    if (platform === "macOS") return <Apple className="w-4 h-4" />;
    if (platform === "Android") return <Smartphone className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>{software.name} - Software Hub</title>
        <meta name="description" content={software.description || `Download ${software.name} ${software.version}`} />
      </Helmet>
      
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t.back_to_list}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Info & Screenshots */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {software.screenshots && software.screenshots.length > 0 && (
              <Image 
                src={software.screenshots[0]} 
                alt={software.name} 
                className="w-full md:w-64 h-40 object-cover rounded-xl shadow-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                referrerPolicy="no-referrer"
                onClick={() => setSelectedScreenshot(software.screenshots[0])}
              />
            )}
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold">{software.name}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary">{software.version}</Badge>
                    <Badge variant="outline">{software.category}</Badge>
                    <span className="text-sm text-muted-foreground">{software.size}</span>
                    {(software as any).rating > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500 ml-2">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-bold">{(software as any).rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({(software as any).comment_count})</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => onDownload(software.id)} size="lg" className="gap-2">
                  <Download className="h-5 w-5" />
                  {t.download}
                </Button>
              </div>
              
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {software.update_date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {software.popularity}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.isArray(software.platforms) && software.platforms.map(p => (
                  <Badge key={p} variant="outline" className="flex items-center gap-1">
                    <PlatformIcon platform={p} />
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
            <button 
              onClick={handleToggleAi}
              className="w-full flex items-center justify-between text-xl font-bold text-primary group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {t.ai_summary || 'AI Summary'}
              </div>
              {isAiExpanded ? (
                <ChevronUp className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors" />
              )}
            </button>
            
            <AnimatePresence>
              {isAiExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    {loadingSummary ? (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-primary/10 rounded w-full" />
                        <div className="h-4 bg-primary/10 rounded w-5/6" />
                        <div className="h-4 bg-primary/10 rounded w-4/6" />
                      </div>
                    ) : aiSummary ? (
                      <div className="space-y-4">
                        <p className="text-sm leading-relaxed text-muted-foreground italic">
                          "{typeof aiSummary.summary === 'object' ? JSON.stringify(aiSummary.summary) : String(aiSummary.summary || "")}"
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiSummary.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                              <span>{typeof h === 'object' ? JSON.stringify(h) : String(h)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        Failed to load AI summary.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Screenshots Gallery */}
          {software.screenshots && software.screenshots.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                {t.screenshots || 'Screenshots'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {software.screenshots.map((src, i) => (
                  <Image 
                    key={i} 
                    src={src} 
                    alt={`Screenshot ${i+1}`} 
                    className="rounded-lg border hover:scale-105 transition-transform cursor-zoom-in"
                    referrerPolicy="no-referrer"
                    onClick={() => setSelectedScreenshot(src)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tutorial */}
          {software.tutorial && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {t.tutorial || 'Tutorial'}
              </h3>
              <div className="markdown-body prose prose-sm dark:prose-invert max-w-none bg-muted/30 p-6 rounded-xl border">
                <Markdown>{software.tutorial}</Markdown>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-6 pt-8 border-t">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              {t.comments}
            </h3>

            {user && (
              <div className="bg-muted/30 p-6 rounded-xl border space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{t.rating}:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star}
                        className={`h-6 w-6 cursor-pointer transition-colors ${star <= newRating ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`}
                        onClick={() => setNewRating(star)}
                      />
                    ))}
                  </div>
                </div>
                <Textarea 
                  placeholder={t.write_comment}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-background"
                />
                <Button 
                  onClick={handleSubmitComment} 
                  disabled={submittingComment}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {t.submit_review}
                </Button>
              </div>
            )}

            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground italic">{t.no_comments}</p>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{c.username}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star 
                              key={idx}
                              className={`h-3 w-3 ${idx < c.rating ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Version History & Related */}
        <div className="space-y-8">
          {/* Version History */}
          {software.version_history && software.version_history.length > 0 && (
            <div className="space-y-4">
              <button 
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full flex items-center justify-between text-xl font-semibold group"
              >
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  {t.version_history}
                </div>
                {isHistoryExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </button>
              
              <AnimatePresence>
                {isHistoryExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-2">
                      {software.version_history.map((h, i) => (
                        <div key={i} className="border-l-2 border-primary/30 pl-4 py-1 hover:border-primary transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm">{h.version}</span>
                            <span className="text-xs text-muted-foreground">{h.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{h.content}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Related Software */}
          {software.related && software.related.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{t.related_software}</h3>
              <div className="space-y-4">
                {software.related.map(s => (
                  <div 
                    key={s.id} 
                    className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      // Trigger re-load by changing ID
                      window.scrollTo(0, 0);
                      setSoftware(null);
                      fetchApi<Software>(`/software/${s.id}`).then(res => {
                        if (res.code === 0) setSoftware(res.data);
                      });
                    }}
                  >
                    {s.screenshots && s.screenshots.length > 0 && (
                      <Image src={s.screenshots[0]} className="w-20 h-14 object-cover rounded" referrerPolicy="no-referrer" />
                    )}
                    <div>
                      <h4 className="font-medium text-sm line-clamp-1">{s.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{s.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Preview Modal */}
      <AnimatePresence>
        {selectedScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 md:p-10"
            onClick={() => setSelectedScreenshot(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0 text-foreground hover:bg-muted"
                onClick={() => setSelectedScreenshot(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Image
                src={selectedScreenshot}
                alt="Zoomed screenshot"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
