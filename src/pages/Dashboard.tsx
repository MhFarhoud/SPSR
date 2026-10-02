import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchData } from "../api";
import type { AppData, User, Child } from "../types";
import { Plus, User as UserIcon, FileText, AlertCircle, ShieldAlert } from "lucide-react";

export function Dashboard({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  // Filter children based on role
  let visibleChildren = data.children.filter(child => !child.archived);
  if (user.role === "مربی" || user.role === "سرمربی") {
    visibleChildren = visibleChildren.filter(c => user.centerIds.includes(c.currentCenterId));
  } else if (user.role === "سوپروایزر") {
    visibleChildren = visibleChildren.filter(c => user.centerIds.includes(c.currentCenterId));
  } else if (user.role === "تیم_تخصصی") {
    // Show children who have alignments pointing to specialized care or high severity
    const specializedPaths = [
      "بررسی تخصصی و تعیین شدت ارجاع",
      "بررسی تکمیلی و احتمال ورود به مسیر زرد یا قرمز"
    ];
    visibleChildren = visibleChildren.filter(c => {
      const alignment = data.alignments.find(a => a.childId === c.id);
      return alignment && specializedPaths.includes(alignment.suggestedPath);
    });
  }

  const getChildStatus = (childId: string) => {
    const alignment = data.alignments.filter(a => a.childId === childId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (alignment) return { text: alignment.suggestedPath, level: alignment.overallTeacherLevel }; // Rough proxy
    
    const tAssess = data.teacherAssessments
      .filter(t => t.childId === childId)
      .sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime())[0];
    if (tAssess) return { text: "در انتظار فرم والد", level: tAssess.score?.totalLevel };
    
    return { text: "ارزیابی نشده", level: "نامشخص" };
  };

  const getLevelColor = (level?: string) => {
    if (level === "بهنجار") return "bg-green-100 text-green-800";
    if (level === "مرزی") return "bg-yellow-100 text-yellow-800";
    if (level === "نابهنجار") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">داشبورد {user.role}</h2>
          <p className="text-sm text-gray-500 mt-1">مدیریت و پایش کودکان</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام کودک</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سن / مقطع</th>
                {user.role !== "مربی" && <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت ارزیابی</th>}
                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleChildren.map((child) => {
                const status = getChildStatus(child.id);
                return (
                <tr key={child.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{child.firstName} {child.lastName}</div>
                        <div className="text-xs text-gray-500">{child.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{child.currentStage}</div>
                    <div className="text-xs text-gray-500">متولد {child.birthDate}</div>
                  </td>
                  {user.role !== "مربی" && <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full w-max ${getLevelColor(status.level)}`}>
                        {status.level}
                      </span>
                      <span className="text-xs text-gray-500">{status.text}</span>
                      <span className="text-xs text-gray-500">وضعیت پرونده: {child.caseStatus?.replace(/_/g, " ") || "نامشخص"}</span>
                    </div>
                  </td>}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3 space-x-reverse">
                    <Link to={`/child/${child.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1">
                      مشاهده پرونده
                    </Link>
                  </td>
                </tr>
              )})}
              {visibleChildren.length === 0 && (
                <tr>
                  <td colSpan={user.role === "مربی" ? 3 : 4} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                    هیچ کودکی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
