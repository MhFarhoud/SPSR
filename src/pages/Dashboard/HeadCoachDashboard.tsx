import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, Activity, AlertTriangle, UserCheck, ArrowLeft, Siren } from "lucide-react";
import { fetchData } from "../../api";
import type { User, AppData } from "../../types";
import { getActiveChildren, hasActiveFollowUp } from "../../domain/caseLifecycle";

/** PDF بخش ۳: داشبورد سرمربی
 * هدف: «کدام مربی، کودک یا اقدام تحت نظارت من نیازمند پیگیری است؟»
 * کارت‌ها: مربیان تحت نظارت، کودکان تحت پوشش، فرم‌های ناقص، فالوآپ‌های فعال، اقدامات نیازمند پیگیری
 * بخش «موارد نیازمند پیگیری» (PDF 3-2)
 * بخش «وضعیت مربیان» (PDF 3-3): هر مربی با تعداد کودکان/فرم‌های کامل/ناقص/فالوآپ/اقدامات
 */
export function HeadCoachDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => { fetchData().then(setData); }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  // Head coach sees children of their supervised coaches
  const supervisedClasses = (data.classes || []).filter(group => group.supervisorId === user.id && user.centerIds.includes(group.centerId));
  const myCoaches = data.users.filter(u => u.role === "مربی" && supervisedClasses.some(group => group.teacherId === u.id));
  const coachIds = myCoaches.map(c => c.id);
  const supervisedClassIds = new Set(supervisedClasses.map(group => group.id));
  const coveredChildren = getActiveChildren(data.children.filter(c => supervisedClassIds.has(c.currentClassId || "")));
  const coveredChildIds = new Set(coveredChildren.map(child => child.id));
  const incompleteAssessments = data.teacherAssessments.filter(a => coveredChildIds.has(a.childId) && coachIds.includes(a.teacherId) && a.status !== "SUBMITTED" && a.status !== "LOCKED" && a.status !== "ثبت_نهایی_شده");
  const activeFollowUps = coveredChildren.filter(child => hasActiveFollowUp(child.id, data.followUps, data.actionItems));
  const pendingActions = data.actionItems.filter(a => coveredChildIds.has(a.childId) && coachIds.includes(a.responsiblePersonId) && a.status !== "انجام_شده" && a.status !== "لغوشده");
  const urgentChildren = coveredChildren.filter(child => child.urgentAction?.isActive);

  const pendingItems = [
    ...pendingActions.map(a => ({ id: a.id, childId: a.childId, type: "اقدام: " + a.action, coachId: a.responsiblePersonId, date: a.createdAt, due: a.dueDate, status: a.status, link: `/child/${a.childId}` })),
    ...incompleteAssessments.map(a => ({ id: a.id, childId: a.childId, type: "فرم ناقص", coachId: a.teacherId, date: a.createdAt, due: a.createdAt, status: a.status, link: `/child/${a.childId}` })),
    ...activeFollowUps.map(child => ({ id: `followup:${child.id}`, childId: child.id, type: "فالوآپ فعال", coachId: data.classes.find(group => group.id === child.currentClassId)?.teacherId || "", date: child.updatedAt || child.createdAt, due: child.updatedAt || child.createdAt, status: "فعال", link: `/child/${child.id}` })),
    ...urgentChildren.map(child => ({ id: `urgent:${child.id}`, childId: child.id, type: `اقدام فوری: ${child.urgentAction?.reason || ""}`, coachId: data.classes.find(group => group.id === child.currentClassId)?.teacherId || "", date: child.urgentAction?.setAt || child.updatedAt, due: child.urgentAction?.setAt || child.updatedAt, status: "فوری", link: `/child/${child.id}` }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const cards = [
    { label: "مربیان تحت نظارت", value: myCoaches.length, icon: UserCheck, color: "bg-indigo-500" },
    { label: "کودکان تحت پوشش", value: coveredChildren.length, icon: Users, color: "bg-blue-500" },
    { label: "فرم‌های ناقص", value: incompleteAssessments.length, icon: FileText, color: "bg-red-500" },
    { label: "فالوآپ‌های فعال", value: activeFollowUps.length, icon: Activity, color: "bg-orange-500" },
    { label: "اقدام‌های فوری فعال", value: urgentChildren.length, icon: Siren, color: "bg-red-600" },
    { label: "اقدامات نیازمند پیگیری", value: pendingActions.length, icon: AlertTriangle, color: "bg-yellow-500" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد سرمربی</h2>
        <p className="mt-1 text-sm text-gray-500">کدام مربی، کودک یا اقدام تحت نظارت من نیازمند پیگیری است؟</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 flex items-center p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-lg ${card.color} text-white ml-4`}><Icon className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 truncate">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF 3-2: موارد نیازمند پیگیری */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">موارد نیازمند پیگیری</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pendingItems.slice(0, 10).map(item => {
              const child = data.children.find(c => c.id === item.childId);
              const coach = myCoaches.find(c => c.id === item.coachId);
              const isOverdue = item.due ? new Date(item.due) < new Date() : false;
              return (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{child?.firstName} {child?.lastName}</p>
                    <p className="text-xs text-gray-500">{item.type} — مربی: {coach?.fullName || 'نامشخص'}</p>
                    <p className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                      ایجاد: {new Date(item.date).toLocaleDateString('fa-IR')}
                      {isOverdue && ' — عقب‌افتاده'}
                    </p>
                  </div>
                  <Link to={item.link} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">ورود <ArrowLeft className="w-3 h-3" /></Link>
                </div>
              );
            })}
            {pendingItems.length === 0 && <p className="text-center text-gray-400 py-6">مورد فعالی وجود ندارد</p>}
          </div>
        </div>
        
        {/* PDF 3-3: وضعیت مربیان — خلاصه هر مربی */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">وضعیت مربیان</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {myCoaches.map(coach => {
              const coachClassIds = new Set(supervisedClasses.filter(group => group.teacherId === coach.id).map(group => group.id));
              const coachChildren = coveredChildren.filter(c => coachClassIds.has(c.currentClassId || ""));
              const completedForms = data.teacherAssessments.filter(a => a.teacherId === coach.id && (a.status === "SUBMITTED" || a.status === "LOCKED" || a.status === "ثبت_نهایی_شده")).length;
              const incompleteForms = data.teacherAssessments.filter(a => a.teacherId === coach.id && a.status !== "SUBMITTED" && a.status !== "LOCKED" && a.status !== "ثبت_نهایی_شده").length;
              return (
                <div key={coach.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                  <p className="text-sm font-bold text-gray-900">{coach.fullName}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">کودک {coachChildren.length}</span>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">فرم ثبت‌شده {completedForms}</span>
                    {incompleteForms > 0 && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">نیمه‌کاره {incompleteForms}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shortcuts — PDF 3-4 */}
      <div className="flex flex-wrap gap-3">
        <Link to="/centers" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100">مشاهده مربیان</Link>
        <Link to="/children" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">کودکان تحت پوشش</Link>
        <Link to="/actions" className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">موارد عقب‌افتاده</Link>
        <Link to="/cases/followup" className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100">فالوآپ‌ها</Link>
        <Link to="/actions" className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100">ثبت نتیجه اقدام</Link>
      </div>
    </div>
  );
}
