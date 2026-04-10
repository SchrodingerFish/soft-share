import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../../store";
import { translations } from "../../i18n";
import { fetchApi } from "../../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

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

export const SubmissionManagement: React.FC = () => {
  const { lang } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubmissions = async () => {
    const res = await fetchApi<Submission[]>("/submissions", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setSubmissions(res.data);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

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
      }
    } catch (err) {
      // Error handled by fetchApi
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.software}</th>
              <th className="px-4 py-3 text-left font-medium">{t.user}</th>
              <th className="px-4 py-3 text-left font-medium">{t.status}</th>
              <th className="px-4 py-3 text-right font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {submissions.map((s) => (
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
                      <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(s.id, 'approved')} disabled={loading}>
                        {t.approve}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleStatusUpdate(s.id, 'rejected')} disabled={loading}>
                        {t.reject}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
