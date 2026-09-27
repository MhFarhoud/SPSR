import React, { useState, useEffect } from "react";
import { fetchData } from "../../api";
import type { User, TeacherAssessment, ParentAssessment, AlignmentResult, AppData } from "../../types";
import { FileText, ClipboardList, GraduationCap, Users as UsersIcon, LineChart } from "lucide-react";
import { Tabs, Tab } from "../../components/ui/Tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { AssessmentScoreSummary } from "../../components/AssessmentScoreSummary";

export function AssessmentsModule({ user }: { user: User }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Parse tab from URL
  const initialTab = location.pathname.split("/").pop();
  const validTabs = user.role === "مربی" ? ["mine", "teacher", "results"] : ["mine", "teacher", "parent", "results"];
  const defaultTab = validTabs.includes(initialTab || "") ? initialTab! : "mine";
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const tab = location.pathname.split("/").pop();
    if (validTabs.includes(tab || "")) setActiveTab(tab!);
  }, [location.pathname, user.role]);

  // Sync tab clicks with URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/assessments/${tabId}`, { replace: true });
  };

  useEffect(() => {
    fetchData().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const allTabs: Tab[] = [
    { id: "mine", label: "ارزیابی‌های من", icon: ClipboardList },
    { id: "teacher", label: "فرم‌های مربی (TPCS)", icon: GraduationCap },
    { id: "parent", label: "فرم‌های والد (PPCS)", icon: UsersIcon },
    { id: "results", label: "نتایج روان‌سنجی", icon: LineChart },
  ];
  const tabs = user.role === "مربی" ? allTabs.filter(tab => tab.id !== "parent") : allTabs;

  if (loading || !data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  let allowedTeacherForms = data.teacherAssessments;
  let allowedParentForms = data.parentAssessments;
  let allowedAlignments = data.alignments;

  if (user.role === "مربی") {
    // Teacher only sees forms they submitted or forms for children in their classes
    const userClasses = data.classes?.filter(c => c.teacherId === user.id) || [];
    const classChildIds = data.children.filter(c => c.currentClassId && userClasses.map(uc => uc.id).includes(c.currentClassId)).map(c => c.id);
    
    allowedTeacherForms = data.teacherAssessments.filter(f => f.teacherId === user.id || classChildIds.includes(f.childId));
    allowedParentForms = [];
    allowedAlignments = data.alignments.filter(a => classChildIds.includes(a.childId));
  } else if (user.role === "سرمربی") {
    // Head Coach sees forms for their centers
    const centerChildIds = data.children.filter(c => user.centerIds.includes(c.currentCenterId)).map(c => c.id);
    allowedTeacherForms = data.teacherAssessments.filter(f => centerChildIds.includes(f.childId));
    allowedParentForms = data.parentAssessments.filter(f => centerChildIds.includes(f.childId));
    allowedAlignments = data.alignments.filter(a => centerChildIds.includes(a.childId));
  }

  const myTeacherForms = allowedTeacherForms.filter(f => f.teacherId === user.id);
  const myParentForms = allowedParentForms.filter(f => (f as any).parentId === user.id);
  
  const renderTeacherTable = (forms: TeacherAssessment[]) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-right">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 font-medium text-gray-500">کودک (Child ID)</th>
            <th className="px-6 py-4 font-medium text-gray-500">تاریخ ارزیابی</th>
            <th className="px-6 py-4 font-medium text-gray-500">وضعیت</th>
            <th className="px-6 py-4 font-medium text-gray-500">نمره کل</th>
            <th className="px-6 py-4 font-medium text-gray-500">سطح نابهنجاری</th>
            <th className="px-6 py-4 font-medium text-gray-500">نمره مقیاس‌ها</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {forms.map(f => (
            <tr key={f.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/child/${f.childId}`)}>{f.childId}</td>
              <td className="px-6 py-4 text-gray-500" dir="ltr">{new Date(f.createdAt).toLocaleDateString('fa-IR')}</td>
              <td className="px-6 py-4">
                {f.status === "SUBMITTED" ? <Badge variant="success">ثبت نهایی</Badge> : <Badge variant="warning">در حال تکمیل</Badge>}
              </td>
              <td className="px-6 py-4 font-medium">{f.score?.totalDifficultiesScore || '-'}</td>
              <td className="px-6 py-4">
                {f.score?.totalLevel === "نابهنجار" ? <Badge variant="danger">نابهنجار</Badge> : f.score?.totalLevel === "مرزی" ? <Badge variant="warning">مرزی</Badge> : <Badge variant="success">عادی</Badge>}
              </td>
              <td className="px-6 py-4 min-w-80">{f.score && <AssessmentScoreSummary score={f.score} compact />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderParentTable = (forms: ParentAssessment[]) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-right">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 font-medium text-gray-500">کودک (Child ID)</th>
            <th className="px-6 py-4 font-medium text-gray-500">تاریخ ارزیابی</th>
            <th className="px-6 py-4 font-medium text-gray-500">وضعیت</th>
            <th className="px-6 py-4 font-medium text-gray-500">نمره کل</th>
            <th className="px-6 py-4 font-medium text-gray-500">سطح نابهنجاری</th>
            <th className="px-6 py-4 font-medium text-gray-500">نمره مقیاس‌ها</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {forms.map(f => (
            <tr key={f.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/child/${f.childId}`)}>{f.childId}</td>
              <td className="px-6 py-4 text-gray-500" dir="ltr">{new Date(f.createdAt).toLocaleDateString('fa-IR')}</td>
              <td className="px-6 py-4">
                {f.status === "SUBMITTED" ? <Badge variant="success">ثبت نهایی</Badge> : <Badge variant="warning">در حال تکمیل</Badge>}
              </td>
              <td className="px-6 py-4 font-medium">{f.score?.totalDifficultiesScore || '-'}</td>
              <td className="px-6 py-4">
                {f.score?.totalLevel === "نابهنجار" ? <Badge variant="danger">نابهنجار</Badge> : f.score?.totalLevel === "مرزی" ? <Badge variant="warning">مرزی</Badge> : <Badge variant="success">عادی</Badge>}
              </td>
              <td className="px-6 py-4 min-w-80">{f.score && <AssessmentScoreSummary score={f.score} compact />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAlignments = (alignments: AlignmentResult[]) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-right">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 font-medium text-gray-500">کودک (Child ID)</th>
            <th className="px-6 py-4 font-medium text-gray-500">تاریخ محاسبۀ همسویی</th>
            <th className="px-6 py-4 font-medium text-gray-500">حوزه‌های ناهمخوان</th>
            <th className="px-6 py-4 font-medium text-gray-500">شدت ناهمخوانی</th>
            <th className="px-6 py-4 font-medium text-gray-500">مسیر پیشنهادی</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {alignments.map((a, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/child/${a.childId}`)}>{a.childId}</td>
              <td className="px-6 py-4 text-gray-500" dir="ltr">{new Date(a.createdAt).toLocaleDateString('fa-IR')}</td>
              <td className="px-6 py-4 text-red-600 font-medium">{a.misalignedAreas.length > 0 ? a.misalignedAreas.join("، ") : "ندارد (کاملاً همسو)"}</td>
              <td className="px-6 py-4">
                {a.misalignmentSeverity === "خفیف" ? <Badge variant="info">خفیف</Badge> : <Badge variant="danger">قابل‌توجه</Badge>}
              </td>
              <td className="px-6 py-4 font-bold text-gray-800">{a.suggestedPath}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">مدیریت ارزیابی‌های جامع</h2>
              <p className="text-sm text-blue-100 mt-1">مشاهده و مدیریت تمامی فرم‌های روان‌سنجی ثبت شده</p>
            </div>
          </div>
        </div>
        
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="mt-6">
        {activeTab === "mine" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">ارزیابی‌های ثبت شده توسط من</h3>
            {user.role === "والد" ? (
              myParentForms.length > 0 ? renderParentTable(myParentForms) : <p className="text-gray-500">شما تاکنون فرمی ثبت نکرده‌اید.</p>
            ) : (
              myTeacherForms.length > 0 ? renderTeacherTable(myTeacherForms) : <p className="text-gray-500">شما تاکنون فرمی ثبت نکرده‌اید.</p>
            )}
          </div>
        )}

        {activeTab === "teacher" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">تمامی ارزیابی‌های مربی (TPCS)</h3>
            {allowedTeacherForms.length > 0 ? renderTeacherTable(allowedTeacherForms) : <p className="text-gray-500">هیچ فرم مربی ثبت نشده است.</p>}
          </div>
        )}

        {activeTab === "parent" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">تمامی ارزیابی‌های والد (PPCS)</h3>
            {allowedParentForms.length > 0 ? renderParentTable(allowedParentForms) : <p className="text-gray-500">هیچ فرم والدی ثبت نشده است.</p>}
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">نتایج همسویی و تصمیم‌گیری</h3>
            {allowedAlignments.length > 0 ? renderAlignments(allowedAlignments) : <p className="text-gray-500">هیچ نتیجه همسویی تاکنون ثبت نشده است.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
