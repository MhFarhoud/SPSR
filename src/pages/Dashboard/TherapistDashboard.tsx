import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle, Clock, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { fetchData } from "../../api";
import type { User, AppData } from "../../types";

/** PDF بخش ششم: پنل اختصاصی درمانگر
 * درمانگر فقط پنل اختصاصی خودش را می‌بیند و نباید به سایر بخش‌های سامانه دسترسی داشته باشد.
 * تب‌ها: ارجاعات من | در حال درمان | گزارش‌های من | پایان‌یافته
 * کارت‌ها: ارجاعات جدید، در انتظار پاسخ، کودکان در حال درمان، گزارش‌های موعددار، نیازمند به‌روزرسانی
 * 
 * اطلاعات قابل مشاهده برای درمانگر (PDF 10): فقط نام کودک، سن، اطلاعات تماس لازم، علت کلی ارجاع، اطلاعات ضروری مرتبط، تاریخ ارجاع
 * نباید ببیند: کل فرم والد/مربی، پاسخ گویه‌ها، پرونده کامل، یادداشت داخلی، سایر کودکان، گزارش مدیریتی
 */
export function TherapistDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState<"referrals" | "treating" | "reports" | "completed">("referrals");
  
  useEffect(() => { fetchData().then(setData); }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const myReferrals = data.referralDecisions.filter(r => r.therapistId === user.id);
  const newReferrals = myReferrals.filter(r => r.status === "در_انتظار_پذیرش_درمانگر" || r.status === "ارسال_شده");
  const inTreatment = myReferrals.filter(r => r.status === "در_حال_درمان" || r.status === "درمان_شروع_شده");
  const completed = myReferrals.filter(r => r.status === "درمان_پایان_یافته" || r.status === "ارجاع_لغو_شده");
  const needingUpdate = myReferrals.filter(r => {
    if (r.status !== "در_حال_درمان") return false;
    const lastUpdate = r.lastUpdateDate || r.createdAt;
    const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 23;
  });

  const cards = [
    { label: "ارجاعات جدید", value: newReferrals.length, icon: Clock, color: "bg-blue-500" },
    { label: "در انتظار پاسخ", value: myReferrals.filter(r => r.status === "در_انتظار_تماس_با_خانواده" || r.status === "وقت_تعیین_شده").length, icon: RefreshCw, color: "bg-yellow-500" },
    { label: "کودکان در حال درمان", value: inTreatment.length, icon: CheckCircle, color: "bg-green-500" },
    { label: "گزارش‌های موعددار", value: myReferrals.filter(r => r.progressReports?.some(rp => rp.nextReportDate && new Date(rp.nextReportDate) <= new Date())).length, icon: Calendar, color: "bg-purple-500" },
    { label: "نیازمند به‌روزرسانی", value: needingUpdate.length, icon: AlertCircle, color: "bg-red-500" }
  ];

  const tabs = [
    { id: "referrals" as const, label: "ارجاعات من", count: newReferrals.length },
    { id: "treating" as const, label: "در حال درمان", count: inTreatment.length },
    { id: "reports" as const, label: "گزارش‌های من", count: myReferrals.flatMap(r => r.progressReports || []).length },
    { id: "completed" as const, label: "پایان‌یافته", count: completed.length }
  ];

  const getChildName = (childId: string) => {
    const child = data.children.find(c => c.id === childId);
    return child ? `${child.firstName} ${child.lastName}` : "نامشخص";
  };

  const getReferralStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  const getReferralStatusColor = (status: string) => {
    if (status.includes("پذیرفته") || status.includes("درمان")) return "bg-green-100 text-green-700";
    if (status.includes("انتظار")) return "bg-yellow-100 text-yellow-700";
    if (status.includes("لغو") || status.includes("رد")) return "bg-red-100 text-red-700";
    if (status.includes("پایان")) return "bg-gray-100 text-gray-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">پنل اختصاصی درمانگر</h2>
        <p className="mt-1 text-sm text-gray-500">خوش آمدید، {user.fullName}. وضعیت ارجاعات و درمان‌های خود را مدیریت کنید.</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 flex flex-col items-center p-5 text-center">
              <div className={`p-3 rounded-full ${card.color} text-white mb-3`}><Icon className="w-6 h-6" /></div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <ul className="flex -mb-px">
            {tabs.map(tab => (
              <li key={tab.id} className="flex-1">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full px-4 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`mr-2 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6">
          {activeTab === "referrals" && (
            <div className="space-y-3">
              {newReferrals.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ارجاع جدیدی وجود ندارد</p>
              ) : newReferrals.map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{getChildName(ref.childId)}</p>
                    <p className="text-xs text-gray-500">علت: {ref.reason || ref.essentialNotes || '—'}</p>
                    <p className="text-xs text-gray-400">تاریخ ارجاع: {new Date(ref.createdAt).toLocaleDateString('fa-IR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">پذیرش</button>
                    <button className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">رد</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "treating" && (
            <div className="space-y-3">
              {inTreatment.length === 0 ? (
                <p className="text-center text-gray-400 py-8">کودکی در حال درمان نیست</p>
              ) : inTreatment.map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{getChildName(ref.childId)}</p>
                    <p className="text-xs text-gray-500">نوع خدمت: {ref.serviceType || '—'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getReferralStatusColor(ref.status)}`}>{getReferralStatusLabel(ref.status)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> ثبت گزارش
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-3">
              {myReferrals.flatMap(r => (r.progressReports || []).map(rp => ({...rp, childId: r.childId}))).length === 0 ? (
                <p className="text-center text-gray-400 py-8">گزارشی ثبت نشده است</p>
              ) : myReferrals.flatMap(r => (r.progressReports || []).map(rp => ({...rp, childId: r.childId}))).sort((a,b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()).slice(0, 15).map(report => (
                <div key={report.id} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between">
                    <p className="text-sm font-bold text-gray-900">{getChildName(report.childId)}</p>
                    <p className="text-xs text-gray-500">{new Date(report.reportDate).toLocaleDateString('fa-IR')}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">جلسات: {report.sessionCount} | روند: {report.overallTrend}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "completed" && (
            <div className="space-y-3">
              {completed.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ارجاع پایان‌یافته‌ای وجود ندارد</p>
              ) : completed.map(ref => (
                <div key={ref.id} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between">
                    <p className="text-sm font-bold text-gray-900">{getChildName(ref.childId)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getReferralStatusColor(ref.status)}`}>{getReferralStatusLabel(ref.status)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">پایان: {ref.endDate ? new Date(ref.endDate).toLocaleDateString('fa-IR') : '—'} | جلسات: {ref.approximateSessions || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
