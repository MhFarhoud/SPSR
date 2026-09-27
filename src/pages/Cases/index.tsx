import React, { useState, useEffect } from "react";
import { fetchData } from "../../api";
import type { User, Child, AppData, CaseStatus } from "../../types";
import { Briefcase, AlertCircle, Activity, HeartHandshake, CheckCircle2, FolderOpen } from "lucide-react";
import { Tabs, Tab } from "../../components/ui/Tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";

export function CasesModule({ user }: { user: User }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Parse tab from URL
  const initialTab = location.pathname.split("/").pop();
  const validTabs = ["active", "review", "intervention", "followup", "closed"];
  const defaultTab = validTabs.includes(initialTab || "") ? initialTab! : "active";
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const tab = location.pathname.split("/").pop();
    if (validTabs.includes(tab || "")) setActiveTab(tab!);
  }, [location.pathname]);

  // Sync tab clicks with URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/cases/${tabId}`, { replace: true });
  };

  useEffect(() => {
    fetchData().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const tabs: Tab[] = [
    { id: "active", label: "پرونده‌های فعال", icon: FolderOpen },
    { id: "review", label: "نیازمند بررسی", icon: AlertCircle },
    { id: "intervention", label: "مداخله در مرکز", icon: HeartHandshake },
    { id: "followup", label: "در حال پایش (فالوآپ)", icon: Activity },
    { id: "closed", label: "بسته شده", icon: CheckCircle2 },
  ];

  if (loading || !data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const children = data.children || [];

  const filterCases = (cases: Child[], filterType: string) => {
    switch(filterType) {
      case "active":
        return cases.filter(c => !c.archived && c.caseStatus !== "بسته_شده");
      case "review":
        return cases.filter(c => c.caseStatus === "نیازمند_بررسی" || c.caseStatus === "بررسی_تخصصی");
      case "intervention":
        return cases.filter(c => c.caseStatus === "مداخله");
      case "followup":
        return cases.filter(c => c.caseStatus === "فالوآپ");
      case "closed":
        return cases.filter(c => c.caseStatus === "بسته_شده" || c.archived);
      default:
        return [];
    }
  };

  const getStatusBadge = (status?: CaseStatus) => {
    switch (status) {
      case "عادی": return <Badge variant="success">پایش عادی</Badge>;
      case "در_حال_ارزیابی": return <Badge variant="info">در حال ارزیابی</Badge>;
      case "نیازمند_بررسی": return <Badge variant="warning">نیازمند بررسی</Badge>;
      case "مداخله": return <Badge variant="danger">مداخله</Badge>;
      case "بررسی_تخصصی": return <Badge variant="danger">بررسی تخصصی</Badge>;
      case "فالوآپ": return <Badge variant="info">فالوآپ</Badge>;
      case "بسته_شده": return <Badge variant="default">بسته شده</Badge>;
      case "بایگانی": return <Badge variant="default">بایگانی</Badge>;
      default: return <Badge variant="default">نامشخص</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch(priority) {
      case "عادی": return <Badge variant="success">اولویت عادی</Badge>;
      case "متوسط": return <Badge variant="warning">اولویت متوسط</Badge>;
      case "بالا": return <Badge variant="danger">اولویت بالا</Badge>;
      case "فوری": return <Badge variant="danger">اقدام فوری</Badge>;
      default: return null;
    }
  };

  const renderCasesTable = (cases: Child[]) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-right">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 font-medium text-gray-500">کودک (Child ID)</th>
            <th className="px-6 py-4 font-medium text-gray-500">نام کودک</th>
            <th className="px-6 py-4 font-medium text-gray-500">وضعیت پرونده</th>
            <th className="px-6 py-4 font-medium text-gray-500">اولویت اقدام</th>
            <th className="px-6 py-4 font-medium text-gray-500">آخرین بروزرسانی</th>
            <th className="px-6 py-4 font-medium text-gray-500">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cases.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/child/${c.id}`)}>
                {c.id}
              </td>
              <td className="px-6 py-4 text-gray-900 font-bold">{c.firstName} {c.lastName}</td>
              <td className="px-6 py-4">{getStatusBadge(c.caseStatus)}</td>
              <td className="px-6 py-4">{getPriorityBadge(c.priority)}</td>
              <td className="px-6 py-4 text-gray-500" dir="ltr">{new Date(c.updatedAt).toLocaleDateString('fa-IR')}</td>
              <td className="px-6 py-4">
                <button 
                  onClick={() => navigate(`/child/${c.id}`)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium bg-indigo-50 px-3 py-1.5 rounded-lg"
                >
                  مشاهده پرونده
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const displayedCases = filterCases(children, activeTab);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">مدیریت پرونده‌ها (Case Management)</h2>
              <p className="text-sm text-teal-100 mt-1">مشاهده و طبقه‌بندی کودکان بر اساس مسیر ارجاع و سطح مداخله</p>
            </div>
          </div>
        </div>
        
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="mt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-bold text-gray-900">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <span className="text-sm text-gray-500 font-medium">تعداد: {displayedCases.length} پرونده</span>
          </div>
          {displayedCases.length > 0 ? (
            activeTab === "review" ? (
              <div className="space-y-4">
                {displayedCases.map(c => {
                  const waitTimeDays = Math.floor((Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                  const isStagnant = waitTimeDays > 3;
                  return (
                    <div key={c.id} className={`bg-white border rounded-xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${isStagnant ? 'border-orange-300' : 'border-gray-200'}`}>
                      {isStagnant && <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>}
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${isStagnant ? 'bg-orange-400' : 'bg-indigo-400'}`}>
                            {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-gray-900 cursor-pointer hover:underline" onClick={() => navigate(`/child/${c.id}`)}>
                                {c.firstName} {c.lastName}
                              </h4>
                              {getPriorityBadge(c.priority)}
                              {isStagnant && <Badge variant="warning">نیازمند توجه فوری (بیش از ۳ روز)</Badge>}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">دلیل ورود: ارزیابی مربی و والد ناهمخوان یا نمره مرزی</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4"/> زمان ورود: {new Date(c.updatedAt).toLocaleDateString('fa-IR')}</span>
                              <span className="flex items-center gap-1"><Activity className="w-4 h-4"/> مدت انتظار: {waitTimeDays} روز</span>
                              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/> مسئول بررسی: سوپروایزر مربوطه</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          {getStatusBadge(c.caseStatus)}
                          <button 
                            onClick={() => navigate(`/child/${c.id}`)}
                            className="text-white bg-indigo-600 hover:bg-indigo-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                          >
                            ورود به پرونده
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              renderCasesTable(displayedCases)
            )
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>هیچ پرونده‌ای در این دسته‌بندی یافت نشد.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
