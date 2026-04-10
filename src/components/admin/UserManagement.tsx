import React, { useState, useEffect } from "react";
import { useAppStore, useAuthStore } from "../../store";
import { translations } from "../../i18n";
import { fetchApi } from "../../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CheckCircle, X, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const UserManagement: React.FC = () => {
  const { lang } = useAppStore();
  const { token } = useAuthStore();
  const t = translations[lang];
  
  const [userList, setUserList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    const res = await fetchApi<any[]>("/admin/users", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.code === 0) {
      setUserList(res.data);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        toast.success(t.success);
        fetchUsers();
      }
    } catch (err) {
      // Error handled by fetchApi
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
        toast.success(t.success);
        fetchUsers();
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
              <th className="px-4 py-3 text-left font-medium">{t.username}</th>
              <th className="px-4 py-3 text-left font-medium">{t.email}</th>
              <th className="px-4 py-3 text-left font-medium">{t.role}</th>
              <th className="px-4 py-3 text-left font-medium">{t.paid_status}</th>
              <th className="px-4 py-3 text-right font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {userList.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email || "-"}</td>
                <td className="px-4 py-3">
                  <Select value={u.role} onValueChange={(v) => handleRoleUpdate(u.id, v)} disabled={loading}>
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t.user}</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.is_paid ? "default" : "secondary"} className="gap-1">
                    {u.is_paid ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {u.is_paid ? t.paid : t.free}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePaidToggle(u.id, u.is_paid)}
                    className="gap-2"
                    disabled={loading}
                  >
                    <CreditCard className="h-4 w-4" />
                    {u.is_paid ? t.set_as_free : t.set_as_paid}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
