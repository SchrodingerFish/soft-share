import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { toast } from "sonner";

export function DownloadModal({ softwareId, isOpen, onClose }: { softwareId: number | null; isOpen: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const { lang } = useAppStore();
  const t = translations[lang];

  useEffect(() => {
    if (isOpen && softwareId) {
      fetchApi<{ hint: string }>(`/software/${softwareId}/hint`).then(res => {
        if (res.code === 0) setExpectedCode(res.data.hint);
      });
    }
  }, [isOpen, softwareId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!softwareId) return;
    
    const res = await fetchApi<{ download_url: string }>(`/software/${softwareId}/download`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    if (res.code === 0) {
      setDownloadUrl(res.data.download_url);
      toast.success("Success");
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
              <p className="text-xs text-muted-foreground">{t.code_hint}: {expectedCode}</p>
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
              <Button render={<a href={downloadUrl} target="_blank" rel="noreferrer" />} className="flex-1">
                Go to Download
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
