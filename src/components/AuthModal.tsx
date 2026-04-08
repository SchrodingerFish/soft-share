import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppStore, useAuthStore } from "../store";
import { translations } from "../i18n";
import { fetchApi } from "../lib/api";
import { toast } from "sonner";

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { lang } = useAppStore();
  const t = translations[lang];
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? "/auth/login" : "/auth/register";
    const res = await fetchApi<any>(endpoint, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (res.code === 0) {
      toast.success(isLogin ? "Login successful" : "Registration successful");
      if (isLogin) {
        login(res.data.user, res.data.token);
      } else {
        // Auto login after register for simplicity, or just switch to login
        setIsLogin(true);
        toast.info("Please login now");
        return;
      }
      onClose();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isLogin ? t.login : t.register}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              placeholder={t.username}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {isLogin ? t.login : t.register}
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-2">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="hover:underline">
              {isLogin ? t.no_account : t.has_account}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
