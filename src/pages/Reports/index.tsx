import React, { useState, useEffect } from "react";
import { fetchData } from "../../api";
import type { User, AppData, Child, TeacherAssessment, ParentAssessment, AlignmentResult } from "../../types";
import { PieChart, BarChart2, Activity, Users, ShieldAlert, TrendingUp } from "lucide-react";
import { Tabs, Tab } from "../../components/ui/Tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";

export function ReportsModule({ user }: { user: User }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initialTab = location.pathname.split("/").pop();
  const validTabs = ["children", "assessments", "psychometrics", "centers", "managerial"];
  const defaultTab = validTabs.includes(initialTab || "") ? initialTab! : "managerial";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const tab = location.pathname.split("/").pop();
    if (validTabs.includes(tab || "")) setActiveTab(tab!);
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/reports/${tabId}`, { replace: true });
  };

  useEffect(() => {
    fetchData().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const tabs: Tab[] = [
    { id: "managerial", label: "داشبورد مدیریتی", icon: TrendingUp },
    { id: "children", label: "گزارش کودکان", icon: Users },
    { id: "assessments", label: "گزارش ارزیابی‌ها", icon: BarChart2 },
    { id: "psychometrics", label: "تحلیل روان‌سنجی", icon: Activity },
    { id: "centers", label: "عملکرد مراکز", icon: ShieldAlert },
  ];

  if (loading || !data) return <div className="p-8 text-center text-gray-500">در حال پردازش داده‌های تحلیلی...</div>;

  // Global Analytics computations
  const totalChildren = data.children.length;
  const boysCount = data.children.filter(c => c.gender === "پسر").length;
  const girlsCount = data.children.filter(c => c.gender === "دختر").length;
  
  const tpcsCount = data.teacherAssessments.length;
  const ppcsCount = data.parentAssessments.length;
  const alignmentCount = data.alignments.length;
  
  const activeCasesCount = data.children.filter(c => !c.archived && c.caseStatus !== "بسته_شده").length;
  const interventionCount = data.children.filter(c => c.caseStatus === "مداخله").length;
  const followupCount = data.children.filter(c => c.caseStatus === "فالوآپ").length;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">گزارش‌ها و داشبوردهای تحلیلی</h2>
              <p className="text-sm text-blue-100 mt-1">مانیتورینگ برخط تمامی شاخص‌های کلیدی سامانه پایش سلامت روان</p>
            </div>
          </div>
        </div>
        
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="mt-6">
        {activeTab === "managerial" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">داشبورد مدیریتی (Overview)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                <span className="text-gray-500 text-sm font-medium mb-1">کل پرونده‌های فعال</span>
                <span className="text-4xl font-black text-indigo-600">{activeCasesCount}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                <span className="text-gray-500 text-sm font-medium mb-1">پرونده‌های در حال مداخله</span>
                <span className="text-4xl font-black text-amber-500">{interventionCount}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                <span className="text-gray-500 text-sm font-medium mb-1">کودکان در مسیر فالوآپ</span>
                <span className="text-4xl font-black text-teal-600">{followupCount}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                <span className="text-gray-500 text-sm font-medium mb-1">فرم‌های همسویی‌شده</span>
                <span className="text-4xl font-black text-blue-600">{alignmentCount}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
              <h4 className="text-gray-500 font-medium mb-4">وضعیت کلی پرونده‌ها در یک نگاه</h4>
              <div className="w-full h-4 flex rounded-full overflow-hidden bg-gray-100">
                <div style={{ width: `${activeCasesCount > 0 ? (activeCasesCount / totalChildren) * 100 : 0}%` }} className="bg-indigo-600 transition-all" title="در جریان"></div>
                <div style={{ width: `${interventionCount > 0 ? (interventionCount / totalChildren) * 100 : 0}%` }} className="bg-amber-500 transition-all" title="مداخله"></div>
                <div style={{ width: `${followupCount > 0 ? (followupCount / totalChildren) * 100 : 0}%` }} className="bg-teal-500 transition-all" title="فالوآپ"></div>
              </div>
              <div className="flex justify-between items-center mt-3 text-xs text-gray-500 px-1">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-600 block"></span> فعال و در جریان</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 block"></span> در حال مداخله تخصصی</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-teal-500 block"></span> تحت نظر (فالوآپ)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "children" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">آمار توصیفی کودکان</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-gray-500 font-medium mb-4 text-center">تفکیک جنسیتی</h4>
                <div className="flex justify-around items-center h-32">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">{boysCount}</div>
                    <span className="text-sm font-medium text-gray-700">پسر ({totalChildren > 0 ? Math.round((boysCount/totalChildren)*100) : 0}%)</span>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">{girlsCount}</div>
                    <span className="text-sm font-medium text-gray-700">دختر ({totalChildren > 0 ? Math.round((girlsCount/totalChildren)*100) : 0}%)</span>
                  </div>
                </div>
              </div>

              <div className="col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-gray-500 font-medium mb-4">توزیع مقاطع آموزشی</h4>
                <div className="space-y-4">
                  {["مهد", "پیش‌دبستانی۱", "پیش‌دبستانی۲"].map(stage => {
                    const count = data.children.filter(c => c.currentStage === stage).length;
                    const percentage = totalChildren > 0 ? Math.round((count/totalChildren)*100) : 0;
                    return (
                      <div key={stage}>
                        <div className="flex justify-between text-sm font-medium mb-1">
                          <span>{stage}</span>
                          <span>{count} نفر ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className="bg-indigo-600 h-2.5 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assessments" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">گزارش فرم‌ها و ارزیابی‌ها</h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-right">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500">نوع فرم</th>
                    <th className="px-6 py-4 font-medium text-gray-500">تعداد کل ثبت شده</th>
                    <th className="px-6 py-4 font-medium text-gray-500">نرخ تکمیل فرم‌ها</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-bold">فرم ارزیابی مربی (TPCS)</td>
                    <td className="px-6 py-4 font-medium text-indigo-600 text-lg">{tpcsCount}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[200px]">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${totalChildren ? Math.min(100, (tpcsCount/totalChildren)*100) : 0}%` }}></div>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-bold">فرم ارزیابی والد (PPCS)</td>
                    <td className="px-6 py-4 font-medium text-indigo-600 text-lg">{ppcsCount}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[200px]">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${totalChildren ? Math.min(100, (ppcsCount/totalChildren)*100) : 0}%` }}></div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "psychometrics" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">تحلیل روان‌سنجی (فراوانی اختلالات)</h3>
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-amber-800 text-sm">
              <strong>توجه:</strong> داده‌های روان‌سنجی بر اساس تجمیع نتایج محاسبه شده از موتور نمره‌گذاری استخراج می‌شوند. برای نمایش گراف‌ها در این بخش به یک کتابخانه Chart نیاز است که در فاز بعدی اضافه می‌شود. فعلاً این تب بستر لازم برای Aggregate کردن نمرات را فراهم کرده است.
            </div>
          </div>
        )}

        {activeTab === "centers" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">عملکرد و شاخص‌های مراکز</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.centers.map(center => {
                const centerChildren = data.children.filter(c => c.currentCenterId === center.id);
                const centerInterventions = centerChildren.filter(c => c.caseStatus === "مداخله" || c.caseStatus === "نیازمند_بررسی");
                return (
                  <div key={center.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4">{center.name}</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">تعداد کل کودکان:</span>
                        <span className="font-bold">{centerChildren.length} نفر</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">کودکان نیازمند توجه ویژه:</span>
                        <span className="font-bold text-danger-600">{centerInterventions.length} نفر</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">نسبت نیاز به مداخله:</span>
                        <span className="font-medium">
                          {centerChildren.length > 0 ? Math.round((centerInterventions.length/centerChildren.length)*100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
