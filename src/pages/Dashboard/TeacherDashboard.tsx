import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, ArrowLeft, Link2 } from "lucide-react";
import { fetchData } from "../../api";
import type { User, AppData } from "../../types";

/** PDF بخش ۲: داشبورد مربی
 * هدف: «چه کارهایی مربوط به کودکان من است و امروز باید چه کاری انجام دهم؟»
 * - کارت‌ها: تعداد کودکان من، فرم‌های تکمیل‌نشده، فالوآپ‌های فعال، اقدامات محوله
 * - بخش «نیازمند اقدام من»: نام کودک + نوع اقدام + مهلت + وضعیت + دکمه ورود
 * - بخش «کودکان من»: نام + سن + کلاس + وضعیت فرم + فالوآپ + اقدام
 * - نکته: مربی نباید نمره فرم، سطح، رنگ نهایی پرونده و نتیجه فرم والد را ببیند
 */
export function TeacherDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => { fetchData().then(setData); }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const myClasses = data.classes?.filter(c => c.teacherId === user.id) || [];
  const myClassIds = myClasses.map(c => c.id);
  const myActions = data.actionItems.filter(a => a.responsiblePersonId === user.id && a.status !== "انجام_شده");
  const assignedTaskChildIds = new Set(myActions.map(action => action.childId));
  const myChildren = data.children.filter(c => (c.currentClassId && myClassIds.includes(c.currentClassId)) || assignedTaskChildIds.has(c.id));
  const isFollowUpAction = (action: string) => /فالو[\s‌-]*آپ|پیگیر/.test(action);

  const copyParentLink = async (childId?: string) => {
    if (!childId) {
      window.alert("شناسه پیگیری کودک ثبت نشده است.");
      return;
    }
    const link = `${window.location.origin}/p/${encodeURIComponent(childId)}`;
    try {
      await navigator.clipboard.writeText(link);
      window.alert("لینک فرم والد کپی شد.");
    } catch {
      window.prompt("لینک فرم والد را کپی کنید:", link);
    }
  };

  const cards = [
    { label: "تعداد کودکان من", value: myChildren.length, icon: Users, color: "bg-blue-500", link: "/assessments/mine" },
    { label: "اقدامات محول‌شده", value: myActions.length, icon: Briefcase, color: "bg-purple-500", link: "/actions/mine" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد مربی</h2>
        <p className="mt-1 text-sm text-gray-500">
          چه کارهایی مربوط به کودکان من است و امروز باید چه کاری انجام دهم؟
        </p>
      </div>

      {/* Summary Cards — clickable per PDF 2-1 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link key={idx} to={card.link} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 flex items-center p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-lg ${card.color} text-white ml-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 truncate">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section: نیازمند اقدام من (PDF 2-2) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">نیازمند اقدام من</h3>
          {myActions.length === 0 ? (
            <p className="text-center text-gray-400 py-6">اقدام فعالی وجود ندارد</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {myActions.slice(0, 10).map(action => {
                const child = data.children.find(c => c.id === action.childId);
                const isOverdue = new Date(action.dueDate) < new Date();
                return (
                  <div key={action.id} className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{child?.firstName} {child?.lastName}</p>
                      <p className="text-xs text-gray-500">{action.action}</p>
                      <p className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                        مهلت: {new Date(action.dueDate).toLocaleDateString('fa-IR')}
                        {isOverdue && ' — عقب‌افتاده'}
                      </p>
                    </div>
                    <Link to={isFollowUpAction(action.action) ? `/child/${action.childId}/followup/new?actionItemId=${encodeURIComponent(action.id)}` : `/child/${action.childId}/form`} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      {isFollowUpAction(action.action) ? "تکمیل فالوآپ" : "تکمیل فرم"} <ArrowLeft className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Section: کودکان من (PDF 2-3) — without score/level per PDF 2-5 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">کودکان من</h3>
            <Link to="/assessments/mine" className="text-sm text-indigo-600 hover:text-indigo-800">مشاهده فرم‌های من</Link>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {myChildren.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">هنوز کودکی به کلاس‌های شما تخصیص داده نشده است.</p>
            )}
            {myChildren.map(child => {
              const hasAction = myActions.some(a => a.childId === child.id);
              return (
                <div key={child.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{child.firstName} {child.lastName}</p>
                    <p className="text-xs text-gray-500">{child.currentStage}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {hasAction && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">اقدام</span>}
                    <button type="button" onClick={() => void copyParentLink(child.childId || child.id)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">
                      <Link2 className="h-3.5 w-3.5" /> لینک والد
                    </button>
                    <Link to={`/child/${child.id}/form`} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                      تکمیل فرم
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shortcuts — PDF 2-4 */}
      <div className="flex flex-wrap gap-3">
        <Link to="/assessments/mine" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">فرم‌های کودکان من</Link>
        <Link to="/assessments/teacher" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">تکمیل فرم ارزیابی</Link>
        <Link to="/actions/mine" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">اقدامات من</Link>
      </div>
    </div>
  );
}
