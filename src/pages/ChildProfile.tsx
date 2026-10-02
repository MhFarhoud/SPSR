import React, { useEffect, useState } from "react";
import { fetchData, updateAction } from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, Tab } from "../components/ui/Tabs";
import { Badge } from "../components/ui/Badge";
import { AssessmentScoreSummary, ASSESSMENT_SCALE_NAMES } from "../components/AssessmentScoreSummary";
import { Child, User, TeacherAssessment, ParentAssessment, AlignmentResult, FollowUp, Center, ClassGroup, ActionItem } from "../types";
import { User as UserIcon, Activity, FileText, CheckSquare, Target, Settings, Plus, ListTodo, AlertTriangle, Pencil, X, Trash2 } from "lucide-react";
import { calculateExactAge } from "../utils/ageCalculator";

export function ChildProfile({ user }: { user?: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [teacherForms, setTeacherForms] = useState<TeacherAssessment[]>([]);
  const [parentForms, setParentForms] = useState<ParentAssessment[]>([]);
  const [alignments, setAlignments] = useState<AlignmentResult[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", nationalId: "", birthDate: "", gender: "پسر" as Child["gender"], parentName: "", parentContactPhone: "", centerId: "", classId: "", stage: "مهد" as Child["currentStage"] });

  useEffect(() => {
    fetchData().then(d => {
      setCenters(d.centers || []);
      setClasses(d.classes || []);
      setAllUsers(d.users || []);
      setTeacherForms(d.teacherAssessments?.filter(f => f.childId === id) || []);
      setParentForms(d.parentAssessments?.filter(f => f.childId === id) || []);
      setAlignments(d.alignments?.filter(a => a.childId === id) || []);
      setFollowUps(d.followUps?.filter(f => f.childId === id) || []);
      setActions(d.actionItems?.filter(a => a.childId === id) || []);
      
      const tl = d.auditLogs?.filter(t => t.entityId === id) || [];
      if (d.followUps?.some(f => f.childId === id)) {
        tl.push({ timestamp: d.followUps.find(f => f.childId === id)!.createdAt, action: "SUBMIT", entityType: "System", entityId: id!, id: "1", userId: "sys", details: `حوزه هدف: ${d.followUps.find(f => f.childId === id)!.targetDomains.join(" و ")}` });
      }
      const childActions = d.actionItems?.filter(a => a.childId === id) || [];
      childActions.forEach(a => {
        const responsible = d.users.find(u => u.id === a.responsiblePersonId)?.fullName || "نامشخص";
        tl.push({ timestamp: a.createdAt, action: "CREATE", entityType: "System", entityId: id!, id: "2", userId: "sys", details: `وظیفه ارجاع شده به ${responsible}: ${a.action}` });
      });
      tl.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTimeline(tl);
    });
    
    fetch(`/api/children/${id}?userId=${encodeURIComponent(user?.id || "")}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.child) {
          setChild(data.child);
        }
      });
  }, [id]);

  if (!child) {
    return <div className="p-8 text-center text-gray-500 font-medium">در حال بارگذاری اطلاعات پرونده...</div>;
  }

  const exactAge = calculateExactAge(child.birthDate);
  const canManageChild = ["ادمین", "تیم_تخصصی", "سرمربی"].includes(user?.role || "");
  const canManageTeacherForms = ["ادمین", "تیم_تخصصی", "سرمربی"].includes(user?.role || "");
  const editableCenters = centers.filter(center => user?.role !== "سرمربی" || user.centerIds.includes(center.id));
  const editableClasses = classes.filter(group => group.centerId === editForm.centerId && (user?.role !== "سرمربی" || group.supervisorId === user.id));
  const openEdit = () => {
    setEditForm({ firstName: child.firstName, lastName: child.lastName, nationalId: child.nationalId || "", birthDate: child.birthDate, gender: child.gender, parentName: child.parentName || "", parentContactPhone: child.parentContactPhone, centerId: child.currentCenterId, classId: child.currentClassId || "", stage: child.currentStage });
    setEditError("");
    setEditOpen(true);
  };
  const saveChild = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingEdit(true);
    setEditError("");
    try {
      const response = await fetch(`/api/children/${child.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editForm, userId: user?.id }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "ذخیره تغییرات انجام نشد.");
      setChild(result.child);
      setEditOpen(false);
      const updated = await fetchData();
      setCenters(updated.centers || []);
      setClasses(updated.classes || []);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "ذخیره تغییرات انجام نشد.");
    } finally {
      setSavingEdit(false);
    }
  };

  let tabs: Tab[] = [
    { id: "overview", label: "اطلاعات پایه", icon: UserIcon },
    { id: "timeline", label: "تایم‌لاین", icon: Activity },
    { id: "assessments", label: "ارزیابی‌ها", icon: FileText },
    { id: "psychometrics", label: "روان‌سنجی", icon: Target },
    { id: "interventions", label: "اقدامات و ارجاعات", icon: CheckSquare },
  ];

  if (user?.role === "والد") {
    tabs = [{ id: "overview", label: "اطلاعات پایه", icon: UserIcon }];
  } else if (user?.role === "مربی") {
    // Coaches can view and manage their own form without seeing assessment results.
    tabs = [
      { id: "overview", label: "اطلاعات پایه", icon: UserIcon },
      { id: "assessments", label: "فرم‌های من", icon: FileText }
    ];
  }

  const deleteTeacherForm = async (form: TeacherAssessment) => {
    if (!window.confirm(`فرم مربی ثبت‌شده در ${new Date(form.createdAt).toLocaleDateString("fa-IR")} حذف شود؟ نتیجهٔ همسویی متصل به این فرم نیز حذف خواهد شد.`)) return;
    const response = await fetch(`/api/assessments/teacher/${encodeURIComponent(form.id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.success) {
      window.alert(result.message || "حذف فرم انجام نشد.");
      return;
    }
    const data = await fetchData();
    setTeacherForms(data.teacherAssessments?.filter(item => item.childId === id) || []);
  };

  const getStatusBadge = (status?: string) => {
    switch(status) {
      case "عادی": return <Badge variant="success">عادی</Badge>;
      case "نیازمند_بررسی": return <Badge variant="warning">نیازمند بررسی</Badge>;
      case "مداخله": return <Badge variant="danger">مداخله روانشناختی</Badge>;
      case "فالوآپ": return <Badge variant="info">تحت فالوآپ</Badge>;
      case "بسته_شده": return <Badge variant="default">بایگانی شده</Badge>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch(priority) {
      case "عادی": return <Badge variant="success">اولویت عادی</Badge>;
      case "متوسط": return <Badge variant="warning">اولویت متوسط</Badge>;
      case "بالا": return <Badge variant="danger">اولویت بالا</Badge>;
      case "فوری": return <Badge variant="danger">فوری (بحرانی)</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 shadow-sm border-2 border-indigo-100">
              {child.firstName.charAt(0)}{child.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{child.firstName} {child.lastName}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-sm text-gray-500">{child.childId || child.id || "بدون شناسه"}</span>
              </div>
            </div>
          </div>
          {user?.role !== "والد" && user?.role !== "مربی" && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                {getPriorityBadge(child.priority)}
                {getStatusBadge(child.caseStatus)}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            {user?.role === "مربی" && <button type="button" onClick={() => navigate(`/child/${child.id}/form`)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"><FileText className="h-4 w-4" /> تکمیل فرم مربی</button>}
            {canManageChild && <button type="button" onClick={openEdit} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Pencil className="h-4 w-4" /> ویرایش و تخصیص</button>}
          </div>
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4" role="dialog" aria-modal="true" aria-label="ویرایش پرونده کودک">
          <form onSubmit={saveChild} className="my-8 w-full max-w-3xl space-y-5 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900">ویرایش پرونده و تخصیص آموزشی</h3><button type="button" onClick={() => setEditOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="بستن"><X className="h-5 w-5" /></button></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">نام<input required value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">نام خانوادگی<input required value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">کد ملی<input dir="ltr" value={editForm.nationalId} onChange={e => setEditForm({...editForm, nationalId:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">تاریخ تولد<input required value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">جنسیت<select value={editForm.gender} onChange={e => setEditForm({...editForm, gender:e.target.value as Child["gender"]})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="پسر">پسر</option><option value="دختر">دختر</option></select></label>
              <label className="text-sm font-medium">نام والد/سرپرست<input value={editForm.parentName} onChange={e => setEditForm({...editForm, parentName:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">تلفن والد<input required dir="ltr" value={editForm.parentContactPhone} onChange={e => setEditForm({...editForm, parentContactPhone:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">مرکز<select required value={editForm.centerId} onChange={e => setEditForm({...editForm, centerId:e.target.value, classId:""})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">{editableCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}</select></label>
              <label className="text-sm font-medium">مقطع<select required value={editForm.stage} onChange={e => setEditForm({...editForm, stage:e.target.value as Child["currentStage"]})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="مهد">مهد</option><option value="پیش‌دبستانی۱">پیش‌دبستانی ۱</option><option value="پیش‌دبستانی۲">پیش‌دبستانی ۲</option></select></label>
              <label className="text-sm font-medium">کلاس و مربی<select value={editForm.classId} onChange={e => setEditForm({...editForm, classId:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">بدون تخصیص کلاس</option>{editableClasses.map(group => { const teacher = allUsers.find(item => item.id === group.teacherId); return <option key={group.id} value={group.id}>{group.name}{teacher ? ` — ${teacher.fullName}` : " — مربی تعیین نشده"}</option>; })}</select></label>
            </div>
            {editError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">انصراف</button><button disabled={savingEdit} type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingEdit ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">اطلاعات هویتی</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">سن دقیق:</span>
                  <span className="font-medium text-indigo-700">{exactAge ? exactAge.formatted : "نامشخص"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">جنسیت:</span>
                  <span className="font-medium">{child.gender}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">نام والد/سرپرست:</span>
                  <span className="font-medium">{child.parentName || "ثبت نشده"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">شماره تماس:</span>
                  <span className="font-medium dir-ltr">{child.parentContactPhone}</span>
                </div>
              </div>
            </div>
            
            {user?.role !== "والد" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">اطلاعات آموزشی</h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">مرکز فعلی:</span>
                    <span className="font-bold text-gray-900">{centers.find(c => c.id === child.currentCenterId)?.name || child.currentCenterId}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">کلاس/گروه فعلی:</span>
                    <span className="font-bold text-gray-900">{classes.find(c => c.id === child.currentClassId)?.name || child.currentClassId || "ثبت نشده"}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">مقطع:</span>
                    <span className="font-medium">{child.currentStage}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">تاریخ ثبت نام:</span>
                    <span className="font-medium">{new Date(child.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">تایم‌لاین پرونده</h3>
            {timeline.length === 0 ? (
              <p className="text-center text-gray-500 py-10">رویدادی ثبت نشده است.</p>
            ) : (
              <div className="relative border-r-2 border-indigo-100 ml-4 mr-2 space-y-6 pr-6">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -right-[1.65rem] top-1.5 border-2 border-white"></div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-900">{event.action === "SUBMIT" ? "ثبت فرم" : event.action === "CREATE" ? "ایجاد" : event.action}</span>
                        <span className="text-xs text-gray-500" dir="ltr">{new Date(event.timestamp).toLocaleDateString('fa-IR')}</span>
                      </div>
                      {event.details && <p className="text-sm text-gray-600 mt-2">{event.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "assessments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-gray-900">ارزیابی‌های انجام شده</h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate(`/child/${child.id}/form`)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-4 h-4" /> فرم مربی (TPCS)
                </button>
                {user?.role !== "مربی" && (
                  <button 
                    onClick={() => navigate(`/child/${child.id}/parent-form`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> فرم والد (PPCS)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> {user?.role === "مربی" ? "فرم‌های من" : "فرم‌های مربی"}
                </h4>
                {teacherForms.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
                    فرم مربی برای این کودک ثبت نشده است.
                  </div>
                ) : (
                  teacherForms.map(form => {
                    const canEditForm = user?.role === "مربی" ? form.teacherId === user.id : canManageTeacherForms;
                    return (
                    <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">شماره فرم: <span className="font-mono">{form.id.substring(0,8)}</span></span>
                          <span className="text-sm font-medium">ثبت: {new Date(form.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                        <Badge variant={form.status === "SUBMITTED" ? "success" : "warning"}>
                          {form.status === "SUBMITTED" ? "تکمیل نهایی" : "پیش‌نویس"}
                        </Badge>
                      </div>
                      {user?.role !== "مربی" && form.score && (
                        <AssessmentScoreSummary score={form.score} />
                      )}
                      {(form.freeTextNotes || form.problemAreas?.length || form.scenarios?.length) ? (
                        <details className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-blue-900">مشاهدات مربی</summary>
                          <div className="mt-3 space-y-3 text-sm text-gray-700">
                            {!!form.problemAreas?.length && <p><span className="font-medium">حوزه‌ها و شدت مشاهده‌شده: </span>{form.problemAreas.map(area => `${area.domain} (${area.severity})`).join("، ")}</p>}
                            {!!form.scenarios?.length && <div className="space-y-2"><p className="font-medium">پاسخ به سناریوهای مشاهده:</p>{form.scenarios.map(scenario => <div key={scenario.scenarioId}><p>{scenario.domain}{scenario.scenarioText ? ` — ${scenario.scenarioText}` : ""}</p><p className="mr-3 text-gray-600">پاسخ مربی: {scenario.selectedOption}</p></div>)}</div>}
                            {!!form.freeTextNotes?.trim() && <p className="whitespace-pre-wrap"><span className="font-medium">یادداشت مربی: </span>{form.freeTextNotes}</p>}
                          </div>
                        </details>
                      ) : <p className="mt-3 text-sm text-gray-500">مشاهدهٔ تکمیلی یا یادداشتی ثبت نشده است.</p>}
                      {canEditForm && <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                        <button type="button" onClick={() => navigate(`/child/${child.id}/form?edit=${encodeURIComponent(form.id)}`)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"><Pencil className="h-4 w-4" /> ویرایش فرم</button>
                        <button type="button" onClick={() => void deleteTeacherForm(form)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> حذف فرم</button>
                      </div>}
                    </div>
                  );})
                )}
              </div>

              {user?.role !== "مربی" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div> فرم‌های والد
                  </h4>
                  {parentForms.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
                      فرم والد برای این کودک ثبت نشده است.
                    </div>
                  ) : (
                    parentForms.map(form => (
                      <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">شماره فرم: <span className="font-mono">{form.id.substring(0,8)}</span></span>
                            <span className="text-sm font-medium">ثبت: {new Date(form.createdAt).toLocaleDateString('fa-IR')}</span>
                          </div>
                          <Badge variant={form.status === "SUBMITTED" ? "success" : "warning"}>
                            {form.status === "SUBMITTED" ? "تکمیل نهایی" : "پیش‌نویس"}
                          </Badge>
                        </div>
                        {form.score && (
                          <AssessmentScoreSummary score={form.score} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "psychometrics" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">نتایج روان‌سنجی و همسویی (Alignment)</h3>
            {alignments.length === 0 ? (
              <div className="bg-orange-50 text-orange-800 p-6 rounded-lg text-center border border-orange-100">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p>برای مشاهده نتایج همسویی، باید حداقل یک فرم مربی و یک فرم والد ثبت نهایی شده باشد.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {alignments.map((alignment, index) => (
                  <div key={alignment.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h4 className="font-bold text-gray-900">نتیجه همسویی #{alignments.length - index}</h4>
                      <span className="text-sm text-gray-500">{new Date(alignment.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                          <p className="text-sm text-blue-600 mb-1">سطح ارزیابی مربی</p>
                          <p className={`text-xl font-bold ${alignment.overallTeacherLevel === 'نابهنجار' ? 'text-red-600' : 'text-blue-900'}`}>{alignment.overallTeacherLevel}</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                          <p className="text-sm text-green-600 mb-1">سطح ارزیابی والد</p>
                          <p className={`text-xl font-bold ${alignment.overallParentLevel === 'نابهنجار' ? 'text-red-600' : 'text-green-900'}`}>{alignment.overallParentLevel}</p>
                        </div>
                        <div className={`${alignment.misalignmentSeverity === 'قابل‌توجه' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 text-center`}>
                          <p className="text-sm text-gray-600 mb-1">شدت ناهمخوانی</p>
                          <p className={`text-xl font-bold ${alignment.misalignmentSeverity === 'قابل‌توجه' ? 'text-red-600' : 'text-gray-900'}`}>{alignment.misalignmentSeverity}</p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h5 className="font-medium text-gray-900 mb-3">حوزه‌های ناهمخوان:</h5>
                        {alignment.misalignedAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {alignment.misalignedAreas.map(area => (
                              <span key={area} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{ASSESSMENT_SCALE_NAMES[area] || area}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">تمامی حوزه‌ها همسو هستند.</span>
                        )}
                      </div>

                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5">
                        <h5 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                          <Target className="w-5 h-5" /> مسیر پیشنهادی سامانه
                        </h5>
                        <p className="text-indigo-800">{alignment.suggestedPath}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "interventions" && (
          <div className="space-y-12">
            
            {/* Follow-Ups Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600" /> فرم‌های فالوآپ
                </h3>
                {user?.role !== "والد" && (
                  <button 
                    onClick={() => navigate(`/child/${child.id}/followup/new`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> ثبت فرم فالوآپ جدید
                  </button>
                )}
              </div>
              
              {followUps.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                  <p>هیچ فرم فالوآپی برای این کودک ثبت نشده است.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUps.map((fu, idx) => (
                    <div key={fu.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-indigo-600 font-bold text-sm bg-indigo-50 px-2 py-1 rounded">فالوآپ #{followUps.length - idx}</span>
                          <h4 className="font-bold text-gray-900 mt-2">رفتار هدف: {fu.targetBehaviors[0]}</h4>
                          <span className="text-sm text-gray-500">حوزه: {fu.targetDomains[0]} | ثبت: {new Date(fu.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                        <Badge variant="success">ثبت نهایی</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="block text-xs text-gray-500 mb-1">میزان اجرا</span>
                          <span className="text-sm font-medium">{fu.implementationLevel}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="block text-xs text-gray-500 mb-1">اثربخشی کلی</span>
                          <span className="text-sm font-medium">{fu.effectiveness}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="block text-xs text-gray-500 mb-1">مشکل همچنان وجود دارد؟</span>
                          <span className="text-sm font-medium text-danger-600">{fu.problemStillExists}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="block text-xs text-gray-500 mb-1">تغییر کلی</span>
                          <span className="text-sm font-medium text-indigo-700">{fu.overallChange}</span>
                        </div>
                      </div>
                      {fu.scaleScores && fu.scaleScores.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h5 className="text-sm font-bold text-gray-800">نمره گویه‌های حوزه فالوآپ (از ۱۰)</h5>
                          {fu.scaleScores.map(scale => (
                            <div key={scale.domain} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                              <span>{scale.domain}</span>
                              <span className="flex items-center gap-2 font-bold">{scale.score} از ۱۰ <Badge variant={scale.level === "نابهنجار" ? "danger" : scale.level === "مرزی" ? "warning" : "success"}>{scale.level}</Badge></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions / Tasks Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-emerald-600" /> وظایف محول شده (ارجاعات)
                </h3>
              </div>
              
              {actions.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                  <p>وظیفه‌ای برای این کودک ارجاع نشده است.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-right font-medium text-gray-500">شرح وظیفه</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500">مسئول انجام</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500">سررسید</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500">وضعیت</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {actions.map(action => {
                        const assignee = allUsers.find(u => u.id === action.responsiblePersonId);
                        const isOverdue = new Date(action.dueDate) < new Date() && action.status !== "انجام_شده";
                        
                        return (
                          <tr key={action.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-gray-700 w-1/3">{action.action}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{assignee?.fullName || "نامشخص"}</td>
                            <td className="px-6 py-4 text-gray-500" dir="ltr">
                              <span className={isOverdue ? "text-danger-600 font-bold" : ""}>
                                {new Date(action.dueDate).toLocaleDateString("fa-IR")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {action.status === "شروع_نشده" && <Badge variant="warning">شروع نشده</Badge>}
                              {action.status === "در_حال_انجام" && <Badge variant="info">در حال انجام</Badge>}
                              {action.status === "انجام_شده" && <Badge variant="success">تکمیل شده</Badge>}
                            </td>
                            <td className="px-6 py-4">
                              {action.status !== "انجام_شده" && action.responsiblePersonId === user?.id && (
                                <div className="flex gap-2">
                                  {action.status === "شروع_نشده" && (
                                    <button onClick={async () => { await updateAction(action.id, {status: "در_حال_انجام"}); window.location.reload(); }} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded font-medium hover:bg-blue-100">شروع</button>
                                  )}
                                  <button onClick={async () => { await updateAction(action.id, {status: "انجام_شده"}); window.location.reload(); }} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded font-medium hover:bg-emerald-100">تکمیل</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
