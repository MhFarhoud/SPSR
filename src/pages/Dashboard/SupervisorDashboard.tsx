import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, AlertCircle, AlertTriangle, Clock, UserCheck, ArrowLeft, FileText } from "lucide-react";
import { fetchData } from "../../api";
import type { User, AppData } from "../../types";

const isCompleted = (status: string) => ["SUBMITTED", "LOCKED", "ثبت_نهایی_شده"].includes(status);

/** Supervisor dashboard with coverage traced through assigned classes: supervisor → coach → children. */
export function SupervisorDashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => { fetchData().then(setData); }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const centerIds = new Set(user.centerIds || []);
  const coveredClasses = (data.classes || []).filter(group => centerIds.has(group.centerId));
  const coveredClassIds = new Set(coveredClasses.map(group => group.id));
  const coveredHeadCoaches = data.users.filter(candidate => candidate.role === "سرمربی" && coveredClasses.some(group => group.supervisorId === candidate.id));
  const headCoachIds = new Set(coveredHeadCoaches.map(headCoach => headCoach.id));
  const coveredCoaches = data.users.filter(candidate => candidate.role === "مربی" && coveredClasses.some(group => group.supervisorId && headCoachIds.has(group.supervisorId) && group.teacherId === candidate.id));
  const coveredChildren = data.children.filter(child => Boolean(child.currentClassId && coveredClassIds.has(child.currentClassId)));
  const coveredChildIds = new Set(coveredChildren.map(child => child.id));

  const casesNeedingReview = coveredChildren.filter(child => child.caseStatus === "نیازمند_بررسی" || child.caseStatus === "بررسی_تخصصی");
  const followUpsNeedingDecision = data.followUps.filter(item => coveredChildIds.has(item.childId) && (item.status === "SUBMITTED" || item.status === "ثبت_نهایی_شده") && !item.specialistDecision);
  const overdueActions = data.actionItems.filter(item => coveredChildIds.has(item.childId) && item.status !== "انجام_شده" && new Date(item.dueDate) < new Date());
  const stagnantChildren = coveredChildren.filter(child => (Date.now() - new Date(child.updatedAt || child.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000 && child.caseStatus !== "بسته_شده" && child.caseStatus !== "عادی");

  const cards = [
    { label: "سرمربیان تحت پوشش", value: coveredHeadCoaches.length, icon: UserCheck, color: "bg-indigo-500" },
    { label: "کودکان تحت پوشش", value: coveredChildren.length, icon: Users, color: "bg-blue-500" },
    { label: "مربیان تحت پوشش", value: coveredCoaches.length, icon: UserCheck, color: "bg-violet-500" },
    { label: "پرونده‌های نیازمند بررسی", value: casesNeedingReview.length, icon: AlertCircle, color: "bg-red-500" },
    { label: "فالوآپ‌های نیازمند تصمیم", value: followUpsNeedingDecision.length, icon: AlertTriangle, color: "bg-orange-500" },
    { label: "اقدامات معوق", value: overdueActions.length, icon: Clock, color: "bg-yellow-500" }
  ];

  const childrenForCoach = (coachId: string) => coveredChildren.filter(child => {
    const group = coveredClasses.find(item => item.id === child.currentClassId);
    return group?.teacherId === coachId;
  });
  const coachesForHeadCoach = (headCoachId: string) => coveredCoaches.filter(coach => coveredClasses.some(group => group.supervisorId === headCoachId && group.teacherId === coach.id));
  const childrenForHeadCoach = (headCoachId: string) => coveredChildren.filter(child => {
    const group = coveredClasses.find(item => item.id === child.currentClassId);
    return group?.supervisorId === headCoachId;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد سوپروایزر</h2>
        <p className="mt-1 text-sm text-gray-500">نمای کامل سرمربیان، مربیان و کودکانی که در مرکزهای تحت پوشش شما هستند.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 flex items-center p-5 hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-lg ${card.color} text-white ml-4`}><Icon className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">پرونده‌های نیازمند اقدام</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {casesNeedingReview.map(child => (
              <Link key={child.id} to={`/child/${child.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{child.firstName} {child.lastName}</p>
                  <p className="text-xs text-gray-500">وضعیت: {child.caseStatus?.replace(/_/g, " ")}</p>
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
            {stagnantChildren.map(child => (
              <Link key={child.id} to={`/child/${child.id}`} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{child.firstName} {child.lastName}</p>
                  <p className="text-xs text-orange-700 font-medium">بیش از ۷ روز بدون اقدام</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-orange-400" />
              </Link>
            ))}
            {stagnantChildren.length === 0 && <p className="text-center text-gray-400 py-6">مورد راکدی وجود ندارد</p>}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">وضعیت سرمربیان تحت پوشش</h3>
        <div className="space-y-4">
          {coveredHeadCoaches.map(headCoach => {
            const headChildren = childrenForHeadCoach(headCoach.id);
            const headCoaches = coachesForHeadCoach(headCoach.id);
            const incompleteForms = data.teacherAssessments.filter(form => headCoachIds.has(form.headCoachId) && form.headCoachId === headCoach.id && headChildren.some(child => child.id === form.childId) && !isCompleted(form.status)).length;
            return (
              <section key={headCoach.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">{headCoach.fullName}</p>
                    <p className="text-xs text-gray-500 mt-1">{headChildren.length} کودک · {headCoaches.length} مربی</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${incompleteForms ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {incompleteForms ? `${incompleteForms} فرم ناقص` : "بدون فرم ناقص"}
                  </span>
                </div>
                {headCoaches.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {headCoaches.map(coach => {
                      const coachChildren = childrenForCoach(coach.id);
                      const childIds = new Set(coachChildren.map(child => child.id));
                      const forms = data.teacherAssessments.filter(form => form.teacherId === coach.id && childIds.has(form.childId));
                      const completedForms = forms.filter(form => isCompleted(form.status)).length;
                      const incompleteCoachForms = forms.filter(form => !isCompleted(form.status)).length;
                      const activeFollowUps = data.followUps.filter(form => form.teacherId === coach.id && childIds.has(form.childId) && !isCompleted(form.status)).length;
                      const pendingCoachActions = data.actionItems.filter(action => action.responsiblePersonId === coach.id && childIds.has(action.childId) && action.status !== "انجام_شده").length;
                      return (
                        <div key={coach.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{coach.fullName}</p>
                            <p className="text-xs text-gray-500 mt-1">{coachChildren.length} کودک تحت پوشش</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1">کودک {coachChildren.length}</span>
                            <span className="rounded-full bg-green-50 text-green-700 px-2.5 py-1">فرم کامل {completedForms}</span>
                            <span className={`rounded-full px-2.5 py-1 ${incompleteCoachForms ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>فرم ناقص {incompleteCoachForms}</span>
                            <span className="rounded-full bg-orange-50 text-orange-700 px-2.5 py-1">فالوآپ فعال {activeFollowUps}</span>
                            <span className="rounded-full bg-yellow-50 text-yellow-700 px-2.5 py-1">اقدام باز {pendingCoachActions}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="p-4 text-sm text-gray-400">هنوز مربی‌ای به کلاس‌های این سرمربی تخصیص داده نشده است.</p>}
              </section>
            );
          })}
          {coveredHeadCoaches.length === 0 && <p className="text-center text-gray-400 py-6">سرمربی‌ای در مرکزهای تحت پوشش ثبت نشده است.</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/cases" className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">پرونده‌های نیازمند بررسی</Link>
        <Link to="/actions" className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100">موارد معوق</Link>
        <Link to="/cases/followup" className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100">فالوآپ‌های آماده بررسی</Link>
        <Link to="/referrals" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100">ارجاعات</Link>
        <Link to="/children" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"><FileText className="inline w-4 h-4 ml-1" />کودکان تحت پوشش</Link>
      </div>
    </div>
  );
}
