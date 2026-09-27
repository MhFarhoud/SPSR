import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LogOut, User, LayoutDashboard, Users, Building, FileText, 
  Briefcase, Activity, Target, CheckSquare, BarChart, Database, Shield, ChevronDown, ChevronUp, Bell, Search
} from "lucide-react";
import type { Role } from "../types";

interface NavItem {
  label: string;
  icon: any;
  path: string;
  subItems?: { label: string; path: string }[];
  adminOnly?: boolean;
  // Roles that should NOT see this menu item
  hiddenFor?: Role[];
  // If set, ONLY these roles can see it
  visibleFor?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "داشبورد", icon: LayoutDashboard, path: "/" },
  { 
    label: "کودکان", icon: Users, path: "/children",
    hiddenFor: ["درمانگر"],
    subItems: [
      { label: "همه کودکان", path: "/children" },
      { label: "افزودن کودک", path: "/children/new" },
      { label: "ورود گروهی (Excel)", path: "/children/import" },
      { label: "بایگانی", path: "/children/archive" }
    ]
  },
  {
    label: "مراکز", icon: Building, path: "/centers",
    hiddenFor: ["مربی", "درمانگر"], // PDF: منوی مراکز برای مربی نمایش داده نشود
    subItems: [
      { label: "مدیریت مراکز و کلاس‌ها", path: "/centers" }
    ]
  },
  {
    label: "ارزیابی‌ها", icon: FileText, path: "/assessments",
    hiddenFor: ["درمانگر"],
    subItems: [
      { label: "ارزیابی‌های من", path: "/assessments/mine" },
      { label: "مربی", path: "/assessments/teacher" },
      { label: "والد", path: "/assessments/parent" },
      { label: "نتایج", path: "/assessments/results" }
    ]
  },
  {
    label: "پرونده‌ها", icon: Briefcase, path: "/cases",
    hiddenFor: ["درمانگر"],
    subItems: [
      { label: "پرونده‌های فعال", path: "/cases/active" },
      { label: "نیازمند بررسی", path: "/cases/review" },
      { label: "مداخله", path: "/cases/intervention" },
      { label: "فالوآپ", path: "/cases/followup" },
      { label: "بسته شده", path: "/cases/closed" }
    ]
  },
  {
    label: "ارجاعات", icon: Target, path: "/referrals",
    hiddenFor: ["مربی"], // PDF: مربی منوی ارجاعات نداشته باشد
    subItems: [
      { label: "همه ارجاعات", path: "/referrals" },
      { label: "در انتظار", path: "/referrals/pending" },
      { label: "در انتظار", path: "/referrals/pending" },
      { label: "در حال درمان", path: "/referrals/active" },
      { label: "نیازمند پیگیری", path: "/referrals/followup" },
      { label: "پایان‌یافته", path: "/referrals/completed" }
    ]
  },
  {
    label: "اقدامات", icon: CheckSquare, path: "/actions",
    hiddenFor: ["درمانگر"],
    subItems: [
      { label: "وظایف من", path: "/actions/my-tasks" },
      { label: "عقب‌افتاده", path: "/actions/overdue" },
      { label: "تکمیل شده", path: "/actions/completed" }
    ]
  },
  {
    label: "گزارش‌ها", icon: BarChart, path: "/reports",
    hiddenFor: ["درمانگر"],
    subItems: [
      { label: "کودکان", path: "/reports/children" },
      { label: "ارزیابی‌ها", path: "/reports/assessments" },
      { label: "روان‌سنجی", path: "/reports/psychometrics" },
      { label: "عملکرد مراکز", path: "/reports/centers" },
      { label: "مدیریتی", path: "/reports/managerial" }
    ]
  },
  {
    label: "داده‌ها", icon: Database, path: "/data",
    hiddenFor: ["درمانگر", "مربی"],
    subItems: [
      { label: "Import", path: "/data/import" },
      { label: "Export", path: "/data/export" }
    ]
  },
  {
    label: "مدیریت", icon: Shield, path: "/admin",
    adminOnly: true,
    subItems: [
      { label: "کاربران", path: "/admin/users" },
      { label: "نقش‌ها و دسترسی‌ها", path: "/admin/roles" },
      { label: "تنظیمات فرم‌ها", path: "/admin/forms" },
      { label: "Audit Log", path: "/admin/audit" }
    ]
  }
];

function NavLink({ item, isActive, onClick }: { key?: React.Key, item: NavItem, isActive: boolean, onClick?: () => void }) {
  const Icon = item.icon;
  const isExpanded = isActive && item.subItems;

  return (
    <div className="mb-1">
      <div 
        className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Link to={item.path} className="flex flex-1 items-center gap-3">
          <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
          <span>{item.label}</span>
        </Link>
        {item.subItems && (
          <button type="button" onClick={onClick} aria-label={`${isExpanded ? "بستن" : "بازکردن"} زیرمنوی ${item.label}`} aria-expanded={Boolean(isExpanded)} className="p-1 rounded hover:bg-black/5">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        )}
      </div>
      {item.subItems && isExpanded && (
        <div className="mt-1 ml-6 pl-4 border-l border-gray-200 space-y-1">
          {item.subItems.map((sub: any) => (
            <Link 
              key={sub.path} 
              to={sub.path}
              className="block px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-md transition-colors"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children, user, onLogout }: { children: React.ReactNode, user: any, onLogout: () => void }) {
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Auto-expand menu based on current route
  React.useEffect(() => {
    const activeItem = NAV_ITEMS.find(item => location.pathname.startsWith(item.path) && item.path !== "/");
    if (activeItem) {
      setActiveMenu(activeItem.label);
    } else if (location.pathname === "/") {
      setActiveMenu("داشبورد");
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans" dir="rtl">
      {/* Sidebar - Hide if user is a parent */}
      {user.role !== "والد" && (
        <aside className="w-64 bg-white border-l border-gray-200 flex flex-col hidden md:flex h-screen sticky top-0">
          <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200">
            <Activity className="w-7 h-7 text-indigo-600" />
            <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">پایش سلامت روان<br/><span className="text-xs text-gray-500 font-normal">نسخه پلتفرم</span></h1>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 px-3">
            {NAV_ITEMS.filter((item) => {
              if (item.adminOnly && user.role !== "ادمین") return false;
              if (item.hiddenFor && item.hiddenFor.includes(user.role)) return false;
              if (item.visibleFor && !item.visibleFor.includes(user.role)) return false;
              return true;
            }).map((item) => {
              const visibleItem = user.role === "مربی" && item.path === "/assessments"
                ? { ...item, subItems: item.subItems?.filter(sub => sub.path !== "/assessments/parent") }
                : item;
              return (
                <NavLink 
                  key={item.label} 
                  item={visibleItem} 
                  isActive={activeMenu === item.label}
                  onClick={() => setActiveMenu(activeMenu === item.label ? null : item.label)}
                />
              );
            })}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex-1 flex items-center">
            {user.role !== "والد" && (
              <div className="relative w-96 hidden lg:block">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی کودک، شماره پرونده..." 
                  className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}
            {user.role === "والد" && (
              <div className="flex items-center gap-3 text-indigo-700">
                <Activity className="w-6 h-6" />
                <span className="font-bold">پایش سلامت روان</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {user.role !== "والد" && (
              <button className="relative p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            )}
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-2" title="خروج">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
