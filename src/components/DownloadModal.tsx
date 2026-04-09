import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { toast } from "sonner";

export function DownloadModal({ softwareId, isOpen, onClose }: { softwareId: number | null; isOpen: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const { lang } = useAppStore();
  const t = translations[lang];

  const { token, user } = useAuthStore();

  useEffect(() => {
    if (isOpen && softwareId) {
      if (!user?.is_paid) {
        setExpectedCode("");
        return;
      }
      fetchApi<{ hint: string }>(`/software/${softwareId}/hint`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => {
        if (res.code === 0) {
          setExpectedCode(res.data.hint);
        } else {
          setExpectedCode("");
        }
      }).catch(() => {
        setExpectedCode("");
      });
    }
  }, [isOpen, softwareId, user, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!softwareId) return;
    
    const res = await fetchApi<{ download_url: string }>(`/software/${softwareId}/download`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    if (res.code === 0) {
      setDownloadUrl(res.data.download_url);
      toast.success(t.success || "Success");
    } else {
      toast.error(res.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadUrl);
    toast.success(t.copied);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setTimeout(() => {
          setCode("");
          setDownloadUrl("");
          setExpectedCode("");
        }, 300);
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.download}</DialogTitle>
        </DialogHeader>
        {!downloadUrl ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Input
                placeholder={t.enter_code}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              {expectedCode ? (
                <p className="text-xs text-muted-foreground">{t.code_hint}: <span className="font-mono font-bold text-primary">{expectedCode}</span></p>
              ) : (
                <p className="text-xs text-destructive">
                  {user ? (t.please_upgrade_hint || "Please upgrade to a paid account to view today's verification code hint.") : (t.please_login_upgrade_hint || "Please login and upgrade to a paid account to view today's verification code hint.")}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              {t.get_link}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <p className="text-sm font-medium">{t.download_link}:</p>
            <div className="p-3 bg-muted rounded-md text-sm break-all max-h-32 overflow-y-auto select-all">
              {downloadUrl}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">{t.copy}</Button>
              <Button render={<a href={downloadUrl} target="_blank" rel="noreferrer" />} nativeButton={false} className="flex-1">
                {t.go_to_download || "Go to Download"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
