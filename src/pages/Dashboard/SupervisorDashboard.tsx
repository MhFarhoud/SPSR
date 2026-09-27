import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, AlertCircle, AlertTriangle, Clock, UserCheck, ArrowLeft } from "lucide-react";
import { fetchData } from "../../api";
import type { User, AppData } from "../../types";

/** PDF بخش ۴: داشبورد سوپروایزر
 * هدف: «کدام پرونده یا اقدام در محدوده من نیازمند بررسی یا تصمیم است؟»
 * محور پرونده — کارت‌ها: سرمربیان، کودکان، پرونده‌های نیازمند بررسی، فالوآپ‌های نیازمند تصمیم، اقدامات معوق
 * بخش «پرونده‌های نیازمند اقدام» (PDF 4-2): نام + دلیل ورود + آخرین اقدام + مدت انتظار + وضعیت
 * بخش «موارد بدون پیشرفت» (PDF 4-3)
 */
export function SupervisorDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => { fetchData().then(setData); }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const coveredChildren = data.children.filter(c => user.centerIds.includes(c.currentCenterId));
  const coveredHeadCoaches = data.users.filter(u => u.role === "سرمربی" && u.centerIds.some(cid => user.centerIds.includes(cid)));
  const casesNeedingReview = coveredChildren.filter(c => c.caseStatus === "نیازمند_بررسی" || c.caseStatus === "بررسی_تخصصی");
  const followUpsNeedingDecision = data.followUps.filter(f => coveredChildren.some(c => c.id === f.childId) && (f.status === "SUBMITTED" || f.status === "ثبت_نهایی_شده") && !f.specialistDecision);
  const overdueActions = data.actionItems.filter(a => coveredChildren.some(c => c.id === a.childId) && a.status !== "انجام_شده" && new Date(a.dueDate) < new Date());

  const cards = [
    { label: "سرمربیان تحت پوشش", value: coveredHeadCoaches.length, icon: UserCheck, color: "bg-indigo-500" },
    { label: "کودکان تحت پوشش", value: coveredChildren.length, icon: Users, color: "bg-blue-500" },
    { label: "پرونده‌های نیازمند بررسی", value: casesNeedingReview.length, icon: AlertCircle, color: "bg-red-500" },
    { label: "فالوآپ‌های نیازمند تصمیم", value: followUpsNeedingDecision.length, icon: AlertTriangle, color: "bg-orange-500" },
    { label: "اقدامات معوق", value: overdueActions.length, icon: Clock, color: "bg-yellow-500" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد سوپروایزر</h2>
        <p className="mt-1 text-sm text-gray-500">کدام پرونده یا اقدام در محدوده من نیازمند بررسی یا تصمیم است؟</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 flex items-center p-5 hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-lg ${card.color} text-white ml-4`}><Icon className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 truncate">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* PDF 4-2: پرونده‌های نیازمند اقدام & PDF 4-3: موارد بدون پیشرفت */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">پرونده‌های نیازمند اقدام</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {casesNeedingReview.map(child => (
              <Link key={child.id} to={`/child/${child.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{child.firstName} {child.lastName}</p>
                  <p className="text-xs text-gray-500">وضعیت: {child.caseStatus?.replace(/_/g, ' ')}</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
            {casesNeedingReview.length === 0 && <p className="text-center text-gray-400 py-6">پرونده فعالی نیازمند بررسی نیست</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">موارد بدون پیشرفت (راکد)</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {coveredChildren.filter(c => (Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000 && c.caseStatus !== "بسته_شده" && c.caseStatus !== "عادی").map(child => (
              <Link key={child.id} to={`/child/${child.id}`} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{child.firstName} {child.lastName}</p>
                  <p className="text-xs text-orange-700 font-medium">بیش از ۷ روز بدون اقدام</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-orange-400" />
              </Link>
            ))}
            {coveredChildren.filter(c => (Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000 && c.caseStatus !== "بسته_شده" && c.caseStatus !== "عادی").length === 0 && <p className="text-center text-gray-400 py-6">مورد راکدی وجود ندارد</p>}
          </div>
        </div>
      </div>

      {/* PDF 4-4: وضعیت سرمربیان */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">وضعیت سرمربیان تحت پوشش</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coveredHeadCoaches.map(hc => {
            const hcChildren = coveredChildren.filter(c => data.teacherAssessments.some(a => a.headCoachId === hc.id && a.childId === c.id));
            const incompleteForms = data.teacherAssessments.filter(a => a.headCoachId === hc.id && a.status !== "SUBMITTED" && a.status !== "LOCKED" && a.status !== "ثبت_نهایی_شده").length;
            
            return (
              <div key={hc.id} className="p-4 rounded-lg border border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <p className="font-bold text-gray-900">{hc.fullName}</p>
                  <p className="text-xs text-gray-500 mt-1">{hcChildren.length} کودک تحت پوشش</p>
                </div>
                <div className="text-right">
                  {incompleteForms > 0 ? (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">{incompleteForms} فرم ناقص</span>
                  ) : (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">بدون فرم ناقص</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shortcuts — PDF 4-5 */}
      <div className="flex flex-wrap gap-3">
        <Link to="/cases" className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">پرونده‌های نیازمند بررسی</Link>
        <Link to="/actions" className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100">موارد معوق</Link>
        <Link to="/cases/followup" className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100">فالوآپ‌های آماده بررسی</Link>
        <Link to="/referrals" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100">ارجاعات</Link>
      </div>
    </div>
  );
}
