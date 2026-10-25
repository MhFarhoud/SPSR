import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, Activity, Briefcase, Clock, FileWarning, Target, Siren } from "lucide-react";
import { fetchData } from "../../api";
import type { User, AppData } from "../../types";
import { hasActiveFollowUp, isArchivedOrClosedChild } from "../../domain/caseLifecycle";

/** PDF بخش ۵: داشبورد مدیریت تخصصی
 * هدف: «وضعیت کلی پروژه چیست و کدام موارد نیازمند اقدام تخصصی یا مدیریتی هستند؟»
 * کارت‌ها: کل کودکان، ارزیابی‌های تکمیل‌شده، پرونده‌های نیازمند بررسی، فالوآپ فعال، ارجاعات باز، اقدامات معوق
 * بخش «نیازمند اقدام تخصصی/مدیریتی» (PDF 5-2)
 * بخش «وضعیت اجرای پروژه» (PDF 5-3)
 * بخش «فعالیت‌های اخیر» (PDF 5-5)
 * میانبرها (PDF 5-6)
 */
export function SpecializedAdminDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => { fetchData().then(setData); }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const isCompleted = (status: string) => ["SUBMITTED", "LOCKED", "ثبت_نهایی_شده"].includes(status);
  const activeChildren = data.children.filter(child => !isArchivedOrClosedChild(child));
  const activeChildIds = new Set(activeChildren.map(child => child.id));
  const totalChildren = activeChildren.length;
  const completedAssessments = data.teacherAssessments.filter(a => activeChildIds.has(a.childId) && isCompleted(a.status)).length;
  const casesNeedingReview = activeChildren.filter(c => c.caseStatus === "نیازمند_بررسی" || c.caseStatus === "بررسی_تخصصی").length;
  const activeFollowUps = activeChildren.filter(child => hasActiveFollowUp(child.id, data.followUps, data.actionItems)).length;
  const openReferrals = data.referralDecisions.filter(r => activeChildIds.has(r.childId) && r.status !== "درمان_پایان_یافته" && r.status !== "ارجاع_لغو_شده").length;
  const overdueActionsList = data.actionItems.filter(a => activeChildIds.has(a.childId) && a.status !== "انجام_شده" && a.status !== "لغوشده" && new Date(a.dueDate) < new Date());
  const overdueActions = overdueActionsList.length;
  const urgentChildren = activeChildren.filter(child => child.urgentAction?.isActive);

  const pendingAdminItems: { id: string, childId: string, title: string, label: string, color: string, date: string, link: string }[] = [];

  // 1. پرونده جدید (Created within last 3 days)
  activeChildren.filter(c => Date.now() - new Date(c.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000).forEach(c =>
    pendingAdminItems.push({ id: `new_${c.id}`, childId: c.id, title: `${c.firstName} ${c.lastName}`, label: "پرونده جدید", color: "bg-blue-100 text-blue-800", date: c.createdAt, link: `/child/${c.id}` })
  );
  // 2. مورد اولویت‌دار
  activeChildren.filter(c => c.priority === "فوری" || c.priority === "بالا").forEach(c =>
    pendingAdminItems.push({ id: `pri_${c.id}`, childId: c.id, title: `${c.firstName} ${c.lastName}`, label: "اولویت‌دار", color: "bg-red-100 text-red-800", date: c.updatedAt || c.createdAt, link: `/child/${c.id}` })
  );
  // 3. فالوآپ آماده تصمیم
  data.followUps.filter(f => activeChildIds.has(f.childId) && isCompleted(f.status) && !f.specialistDecision).forEach(f => {
    const child = data.children.find(c => c.id === f.childId);
    if (child) pendingAdminItems.push({ id: `fup_${f.id}`, childId: child.id, title: `${child.firstName} ${child.lastName}`, label: "فالوآپ آماده تصمیم", color: "bg-orange-100 text-orange-800", date: f.createdAt, link: `/child/${child.id}` });
  });
  // 4. ارجاع بدون پیگیری (Open referrals)
  data.referralDecisions.filter(r => activeChildIds.has(r.childId) && r.status !== "درمان_پایان_یافته" && r.status !== "ارجاع_لغو_شده").forEach(r => {
    const child = data.children.find(c => c.id === r.childId);
    if (child) pendingAdminItems.push({ id: `ref_${r.id}`, childId: child.id, title: `${child.firstName} ${child.lastName}`, label: "ارجاع باز", color: "bg-purple-100 text-purple-800", date: r.createdAt, link: `/child/${child.id}` });
  });
  // 5. پرونده بدون پیشرفت (راکد)
  activeChildren.filter(c => (Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000 && c.caseStatus !== "عادی").forEach(c =>
    pendingAdminItems.push({ id: `stalled_${c.id}`, childId: c.id, title: `${c.firstName} ${c.lastName}`, label: "بدون پیشرفت", color: "bg-gray-200 text-gray-800", date: c.updatedAt || c.createdAt, link: `/child/${c.id}` })
  );
  // 6. اقدام عقب‌افتاده
  overdueActionsList.forEach(a => {
    const child = data.children.find(c => c.id === a.childId);
    if (child) pendingAdminItems.push({ id: `act_${a.id}`, childId: child.id, title: `${child.firstName} ${child.lastName} - ${a.action}`, label: "اقدام عقب‌افتاده", color: "bg-yellow-100 text-yellow-800", date: a.dueDate, link: `/child/${child.id}` });
  });
  // 7. نیازمند تایید یا تعیین مسیر
  activeChildren.filter(c => c.caseStatus === "نیازمند_بررسی" || c.caseStatus === "بررسی_تخصصی").forEach(c =>
    pendingAdminItems.push({ id: `rev_${c.id}`, childId: c.id, title: `${c.firstName} ${c.lastName}`, label: "نیازمند تعیین مسیر", color: "bg-indigo-100 text-indigo-800", date: c.updatedAt || c.createdAt, link: `/child/${c.id}` })
  );
  urgentChildren.forEach(child => pendingAdminItems.push({ id: `urgent_${child.id}`, childId: child.id, title: `${child.firstName} ${child.lastName} · ${child.urgentAction?.reason || ""}`, label: "اقدام فوری فعال", color: "bg-red-100 text-red-800", date: child.urgentAction?.setAt || child.updatedAt || child.createdAt, link: `/child/${child.id}` }));

  pendingAdminItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  // PDF 5-3: project execution stats
  const totalTeacherForms = activeChildren.length;
  const totalParentForms = activeChildren.length;
  const completedTeacher = activeChildren.filter(child => data.teacherAssessments.some(a => a.childId === child.id && isCompleted(a.status))).length;
  const completedParent = activeChildren.filter(child => data.parentAssessments.some(a => a.childId === child.id && isCompleted(a.status))).length;
  const incompleteTeacher = Math.max(0, totalTeacherForms - completedTeacher);
  const teacherPct = totalTeacherForms > 0 ? Math.round((completedTeacher / totalTeacherForms) * 100) : 0;
  const parentPct = totalParentForms > 0 ? Math.round((completedParent / totalParentForms) * 100) : 0;

  const totalFollowUps = data.followUps.filter(f => activeChildIds.has(f.childId)).length;
  const completedFollowUps = data.followUps.filter(f => activeChildIds.has(f.childId) && f.specialistDecision === "پایان فالوآپ و بازگشت به پایش معمول").length;
  const followUpPct = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

  const closedReferrals = data.referralDecisions.filter(r => activeChildIds.has(r.childId) && (r.status === "درمان_پایان_یافته" || r.status === "ارجاع_لغو_شده")).length;
  const openCases = activeChildren.length;
  const closedCases = data.children.filter(c => c.caseStatus === "بسته_شده" || c.caseStatus === "بایگانی" || c.archived).length;

  const cards = [
    { label: "کل کودکان", value: totalChildren, icon: Users, color: "bg-blue-500", link: "/children" },
    { label: "ارزیابی‌های تکمیل‌شده", value: completedAssessments, icon: FileText, color: "bg-green-500", link: "/assessments" },
    { label: "پرونده‌های نیازمند بررسی", value: casesNeedingReview, icon: FileWarning, color: "bg-red-500", link: "/children?status=نیازمند_بررسی" },
    { label: "فالوآپ‌های فعال", value: activeFollowUps, icon: Activity, color: "bg-orange-500", link: "/children?status=فالوآپ" },
    { label: "اقدام‌های فوری", value: urgentChildren.length, icon: Siren, color: "bg-red-600", link: "/cases/review" },
    { label: "ارجاعات باز", value: openReferrals, icon: Target, color: "bg-purple-500", link: "/referrals" },
    { label: "اقدامات معوق", value: overdueActions, icon: Clock, color: "bg-yellow-500", link: "/actions/overdue" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد مدیریت تخصصی</h2>
        <p className="mt-1 text-sm text-gray-500">وضعیت کلی پروژه چیست و کدام موارد نیازمند اقدام تخصصی یا مدیریتی هستند؟</p>
      </div>

      {/* Cards — PDF 5-1 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link key={idx} to={card.link} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 flex flex-col items-center p-5 hover:shadow-md transition-shadow text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label={`مشاهده فهرست ${card.label}`}>
              <div className={`p-3 rounded-full ${card.color} text-white mb-3`}><Icon className="w-6 h-6" /></div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
              <span className="mt-2 text-xs text-indigo-600">مشاهده فهرست</span>
            </Link>
          );
        })}
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(["سوپروایزر", "سرمربی"] as const).map(role => {
          const staff = data.users.filter(person => person.role === role && person.isActive !== false);
          return (
            <div key={role} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{role}های فعال <span className="text-indigo-600">({staff.length})</span></h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {staff.map(person => {
                  const centers = data.centers.filter(center => (person.centerIds || []).includes(center.id));
                  return <div key={person.id} className="rounded-lg border border-gray-100 p-3">
                    <p className="font-semibold text-gray-800">{person.fullName}</p>
                    <p className="mt-1 text-xs text-gray-500">{centers.map(center => center.name).join("، ") || "مرکز تحت پوشش ثبت نشده"}</p>
                  </div>;
                })}
                {staff.length === 0 && <p className="py-4 text-center text-sm text-gray-400">فرد فعالی در این نقش ثبت نشده است.</p>}
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF 5-2: نیازمند اقدام تخصصی/مدیریتی */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">نیازمند اقدام تخصصی / مدیریتی</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {pendingAdminItems.slice(0, 15).map(item => (
              <Link key={item.id} to={item.link} className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-gray-900 truncate pr-2">{item.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${item.color}`}>{item.label}</span>
                </div>
                <p className="text-xs text-gray-500">تاریخ ثبت/مهلت: {new Date(item.date).toLocaleDateString('fa-IR')}</p>
              </Link>
            ))}
            {pendingAdminItems.length === 0 && <p className="text-center text-gray-500 py-4">موردی یافت نشد.</p>}
          </div>
        </div>

        {/* PDF 5-3: وضعیت اجرای پروژه */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">وضعیت اجرای پروژه</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">تکمیل فرم مربی</span><span className="font-bold">{completedTeacher} از {totalTeacherForms} مورد — {teacherPct}٪</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-green-500 rounded-full" style={{width: `${teacherPct}%`}}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">تکمیل فرم والد</span><span className="font-bold">{completedParent} از {totalParentForms} مورد — {parentPct}٪</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{width: `${parentPct}%`}}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">فالوآپ‌های تعیین‌تکلیف‌شده</span><span className="font-bold">{completedFollowUps} از {totalFollowUps} مورد — {followUpPct}٪</span></div>
              <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-orange-500 rounded-full" style={{width: `${followUpPct}%`}}></div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold text-gray-900">{incompleteTeacher}</p><p className="text-xs text-gray-500">فرم ناقص مربی</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold text-gray-900">{openReferrals}</p><p className="text-xs text-gray-500">ارجاعات باز</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold text-gray-900">{closedReferrals}</p><p className="text-xs text-gray-500">ارجاعات تکمیل‌شده</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold text-gray-900">{openCases}</p><p className="text-xs text-gray-500">پرونده‌های باز</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold text-gray-900">{closedCases}</p><p className="text-xs text-gray-500">پرونده‌های بسته</p></div>
              <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold text-gray-900">{overdueActions}</p><p className="text-xs text-gray-500">اقدامات معوق</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF 5-4: وضعیت واحدها */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">وضعیت واحدها</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.centers.map(center => {
              const centerChildren = data.children.filter(c => c.currentCenterId === center.id);
              const activeCenterChildren = centerChildren.filter(child => !isArchivedOrClosedChild(child));
              const activeCenterIds = new Set(activeCenterChildren.map(child => child.id));
              const completedForms = activeCenterChildren.filter(child => data.teacherAssessments.some(a => a.childId === child.id && isCompleted(a.status))).length;
              const pct = activeCenterChildren.length > 0 ? Math.round((completedForms / activeCenterChildren.length) * 100) : 0;
              const reviewCount = activeCenterChildren.filter(child => child.caseStatus === "نیازمند_بررسی" || child.caseStatus === "بررسی_تخصصی").length;
              const interventionCount = activeCenterChildren.filter(child => child.caseStatus === "مداخله").length;
              const followupCount = activeCenterChildren.filter(child => hasActiveFollowUp(child.id, data.followUps, data.actionItems)).length;
              const archivedCount = centerChildren.length - activeCenterChildren.length;
              const centerHeadCoaches = data.users.filter(person => person.role === "سرمربی" && (person.isActive !== false) && (person.centerIds || []).includes(center.id));
              const centerSupervisors = data.users.filter(person => person.role === "سوپروایزر" && (person.isActive !== false) && (person.centerIds || []).includes(center.id));

              return (
                <div key={center.id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-900">{center.name}</span>
                    <span className="text-xs text-gray-500"><Link to={`/children?centerId=${encodeURIComponent(center.id)}`} className="hover:underline">{activeCenterChildren.length} کودک فعال</Link> · <Link to={`/children/archive?centerId=${encodeURIComponent(center.id)}`} className="hover:underline">{archivedCount} بسته/بایگانی</Link></span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>تکمیل فرم مربی</span>
                    <span>{completedForms} از {activeCenterChildren.length} · {pct}٪</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-indigo-500 rounded-full" style={{width: `${pct}%`}}></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link to={`/children?centerId=${encodeURIComponent(center.id)}&status=نیازمند_بررسی`} className="rounded-full bg-red-50 text-red-700 px-2 py-1">نیازمند بررسی {reviewCount}</Link>
                    <Link to={`/children?centerId=${encodeURIComponent(center.id)}&status=مداخله`} className="rounded-full bg-purple-50 text-purple-700 px-2 py-1">مداخله {interventionCount}</Link>
                    <Link to={`/children?centerId=${encodeURIComponent(center.id)}&status=فالوآپ`} className="rounded-full bg-orange-50 text-orange-700 px-2 py-1">فالوآپ فعال {followupCount}</Link>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    سوپروایزر: {centerSupervisors.map(person => person.fullName).join("، ") || "تعیین نشده"} · سرمربی: {centerHeadCoaches.map(person => person.fullName).join("، ") || "تعیین نشده"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PDF 5-5: فعالیت‌های اخیر (فقط رویدادهای مهم) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">فعالیت‌های اخیر</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-gray-200">
            {data.auditLogs
              .filter(log => log.action === "STATUS_CHANGE" || log.action === "SUBMIT" || log.entityType === "Referral")
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 10).map((log, idx) => {
              const user = data.users.find(u => u.id === log.userId);
              let title = "فعالیت ثبت شد";
              if (log.entityType === "Referral" && log.action === "CREATE") title = "ارجاع جدید ایجاد شد";
              if (log.entityType === "FollowUp" && log.action === "SUBMIT") title = "فالوآپ تکمیل شد";
              if (log.entityType === "Case" && log.action === "STATUS_CHANGE") title = `تغییر وضعیت پرونده به ${log.newValue?.replace(/_/g, ' ')}`;

              return (
                <div key={log.id} className="relative pl-8">
                  <div className="absolute left-0 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full"></div>
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">توسط {user?.fullName || 'سیستم'} — {new Date(log.timestamp).toLocaleDateString('fa-IR')}</p>
                </div>
              );
            })}
            {data.auditLogs.filter(log => log.action === "STATUS_CHANGE" || log.action === "SUBMIT" || log.entityType === "Referral").length === 0 && <p className="text-center text-gray-400 py-4">فعالیت مهمی ثبت نشده است</p>}
          </div>
        </div>
      </div>

      {/* Shortcuts — PDF 5-6 */}
      <div className="flex flex-wrap gap-3">
        <Link to="/children" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">جستجوی کودک</Link>
        <Link to="/cases" className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">پرونده‌های جدید</Link>
        <Link to="/actions" className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100">موارد نیازمند اقدام</Link>
        <Link to="/cases/followup" className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100">فالوآپ‌های آماده بررسی</Link>
        <Link to="/referrals" className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100">ارجاعات باز</Link>
        <Link to="/actions" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">اقدامات معوق</Link>
        <Link to="/reports" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">گزارش‌ها</Link>
      </div>
    </div>
  );
}
