import React, { useState } from "react";
import { useAppStore } from "../store";
import { translations } from "../i18n";
import { Button } from "./ui/button";
import { Layers, Package, Send, Users, Tags, FolderTree, Menu } from "lucide-react";
import { SoftwareManagement } from "./admin/SoftwareManagement";
import { CollectionManagement } from "./admin/CollectionManagement";
import { SubmissionManagement } from "./admin/SubmissionManagement";
import { UserManagement } from "./admin/UserManagement";
import { CategoryManagement } from "./admin/CategoryManagement";
import { TagManagement } from "./admin/TagManagement";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

export const AdminDashboard: React.FC = () => {
  const { lang } = useAppStore();
  const t = translations[lang];
  
  const [activeTab, setActiveTab] = useState<"software" | "collections" | "submissions" | "users" | "categories" | "tags">("software");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "software", label: t.software_management || "Software", icon: Package },
    { id: "collections", label: t.collection_management || "Collections", icon: Layers },
    { id: "categories", label: t.category_management || "Categories", icon: FolderTree },
    { id: "tags", label: "Tags", icon: Tags },
    { id: "submissions", label: t.submission_management || "Submissions", icon: Send },
    { id: "users", label: t.user_management || "Users", icon: Users },
  ] as const;

  const NavContent = () => (
    <div className="flex flex-col gap-2">
      {menuItems.map((item) => (
        <Button
          key={item.id}
          variant={activeTab === item.id ? "secondary" : "ghost"}
          className="justify-start w-full"
          onClick={() => {
            setActiveTab(item.id);
            setIsMobileMenuOpen(false);
          }}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Mobile Header & Drawer */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t.admin_panel}</h2>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle>{t.admin_panel}</SheetTitle>
            </SheetHeader>
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <div className="sticky top-6 space-y-6">
          <h2 className="text-2xl font-bold px-2">{t.admin_panel}</h2>
          <div className="bg-muted/50 p-2 rounded-xl">
            <NavContent />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {activeTab === "software" && <SoftwareManagement />}
        {activeTab === "collections" && <CollectionManagement />}
        {activeTab === "categories" && <CategoryManagement />}
        {activeTab === "tags" && <TagManagement />}
        {activeTab === "submissions" && <SubmissionManagement />}
        {activeTab === "users" && <UserManagement />}
      </div>
    </div>
  );
};
