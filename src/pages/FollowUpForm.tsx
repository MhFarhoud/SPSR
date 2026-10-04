import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { User, FollowUp, Child, AppData } from "../types";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { fetchData } from "../api";
import { FOLLOW_UP_QUESTIONS, FOLLOW_UP_SCALES } from "../followUpScales";

const FOLLOW_UP_REASONS: FollowUp["triggerReason"][] = ["نمره مرزی یا نابهنجار در فرم مربی", "نمره مرزی یا نابهنجار در فرم والد", "اختلاف بین فرم والد و مربی", "نمره تأثیر بالا", "نگرانی ثبت‌شده مربی", "تصمیم سرمربی یا تیم تخصصی", "پیگیری پس از ارائه راهکار", "پیگیری پس از شروع خدمات تخصصی", "بروز نشانه جدید"];
const CENTER_ACTION_OPTIONS = ["راهنمایی مربی", "اجرای راهکار حمایتی در کلاس", "تغییر یا تنظیم شرایط کلاس", "مشاهده هدفمند توسط مربی", "بررسی سرمربی", "گفت‌وگو با خانواده", "جلسه مشترک مربی و خانواده", "هنوز اقدامی در مرکز انجام نشده است"];
const SPECIALIST_SERVICES = ["روان‌شناسی یا مشاوره", "بازی‌درمانی", "رفتاردرمانی", "کاردرمانی", "گفتاردرمانی", "آموزش یا توان‌بخشی ویژه", "ارزیابی روان‌پزشکی", "دارودرمانی", "خدمات پزشکی مرتبط", "سایر", "هیچ‌کدام", "اطلاعی ندارم"];
const SERVICE_STATUSES: NonNullable<FollowUp["specialistServicesDone"]>[number]["status"][] = ["در حال انجام", "انجام شده و پایان یافته", "قطع شده", "هنوز شروع نشده", "وضعیت نامشخص"];

export function FollowUpForm({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedActionId = searchParams.get("actionItemId") || "";

  const [child, setChild] = useState<Child | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [previousAssessmentId, setPreviousAssessmentId] = useState("");
  const [previousAssessmentType, setPreviousAssessmentType] = useState<"TPCS" | "PPCS">("TPCS");
  const [targetDomains, setTargetDomains] = useState<FollowUp["targetDomains"]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [targetBehavior, setTargetBehavior] = useState("");
  const [triggerReason, setTriggerReason] = useState<FollowUp["triggerReason"]>("پیگیری پس از ارائه راهکار");
  const [implementationLevel, setImplementationLevel] = useState<FollowUp["implementationLevel"]>("هنوز راهکاری پیشنهاد نشده است.");
  const [overallChange, setOverallChange] = useState<FollowUp["overallChange"]>("تقریباً مانند قبل است.");
  const [effectiveness, setEffectiveness] = useState<FollowUp["effectiveness"]>("برای قضاوت زود است.");
  const [problemStillExists, setProblemStillExists] = useState<NonNullable<FollowUp["problemStillExists"]>>("بله، به میزان کم");
  const [childDistress, setChildDistress] = useState<FollowUp["childDistress"]>("خیر");
  const [impactOnLearning, setImpactOnLearning] = useState<FollowUp["impactOnLearning"]>("خیر");
  const [impactOnPeers, setImpactOnPeers] = useState<FollowUp["impactOnPeers"]>("خیر");
  const [impactOnTeacher, setImpactOnTeacher] = useState<NonNullable<FollowUp["impactOnTeacher"]>>("خیر");
  const [classManagementBurden, setClassManagementBurden] = useState<NonNullable<FollowUp["classManagementBurden"]>>("خیر");
  const [centerActionsDone, setCenterActionsDone] = useState<string[]>([]);
  const [specialistServicesDone, setSpecialistServicesDone] = useState<NonNullable<FollowUp["specialistServicesDone"]>>([]);
  const [nonImplementationReason, setNonImplementationReason] = useState<FollowUp["nonImplementationReason"]>();
  const [newBehaviorObserved, setNewBehaviorObserved] = useState(false);
  const [newBehaviorDescription, setNewBehaviorDescription] = useState("");
  const [newBehaviorKeywordsText, setNewBehaviorKeywordsText] = useState("");
  const [newBehaviorDate, setNewBehaviorDate] = useState("");
  const [requiresImmediateReport, setRequiresImmediateReport] = useState(false);
  const [freeTextNotes, setFreeTextNotes] = useState("");
  const [specialistDecision, setSpecialistDecision] = useState<FollowUp["specialistDecision"]>();
  const [assignedActionId, setAssignedActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    fetchData().then(data => {
      setAppData(data);
      const c = data.children.find(ch => ch.id === id);
      if (!c) {
        setLoadError("این کودک در محدوده دسترسی حساب شما نیست یا وظیفهٔ معتبری برای او ثبت نشده است.");
        return;
      }
      setChild(c);

      if (user.role === "مربی") {
        const action = data.actionItems.find(item => item.id === requestedActionId && item.childId === id && item.responsiblePersonId === user.id && item.status !== "انجام_شده");
        if (!action || !/فالو[\s‌-]*آپ|پیگیر/.test(action.action)) {
          setLoadError("برای ثبت فالوآپ باید یک وظیفهٔ فعال فالوآپ برای این کودک به حساب شما ارجاع شده باشد.");
          return;
        }
        setAssignedActionId(action.id);
        const assignedDomain = action.targetDomain;
        const assignedScale = FOLLOW_UP_SCALES.find(scale => scale.key === assignedDomain || scale.domain === assignedDomain || scale.label === assignedDomain);
        // The task can suggest an initial target, but the teacher must be able to select every applicable domain.
        if (assignedScale) setTargetDomains([assignedScale.domain]);
        else setTargetDomains([]);
        setTriggerReason("تصمیم سرمربی یا تیم تخصصی");
        return;
      }

      const assessments = [
        ...data.teacherAssessments.filter(form => form.childId === id).map(form => ({ ...form, sourceType: "TPCS" as const })),
        ...data.parentAssessments.filter(form => form.childId === id).map(form => ({ ...form, sourceType: "PPCS" as const }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const baseline = assessments.find(form => form.score?.subscales.some(scale => scale.level !== "بهنجار"));
      if (baseline) {
        setPreviousAssessmentId(baseline.id);
        setPreviousAssessmentType(baseline.sourceType);
        const needsFollowUp = baseline.score?.subscales.filter(scale => scale.level !== "بهنجار").map(scale => {
          return FOLLOW_UP_SCALES.find(item => item.key === scale.domain)?.domain;
        }).filter((domain): domain is NonNullable<typeof domain> => Boolean(domain)) || [];
        setTargetDomains(needsFollowUp);
      } else {
        setTargetDomains([]);
      }
    }).catch(() => {
      setLoadError("بارگذاری اطلاعات این وظیفه ناموفق بود. لطفاً دوباره تلاش کنید.");
    }).finally(() => setLoading(false));
  }, [id, requestedActionId, user.id, user.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetDomains.length === 0) {
      alert("لطفاً دست‌کم یک حوزه هدف انتخاب کنید.");
      return;
    }
    const requiredQuestionIds: number[] = [...new Set<number>(targetDomains.flatMap((domain): number[] => {
      const scale = FOLLOW_UP_SCALES.find(item => item.domain === domain);
      return scale ? [...scale.questions] : [];
    }))];
    if (requiredQuestionIds.some(questionId => answers[questionId] === undefined)) {
      alert("لطفاً به هر پنج گویهٔ همهٔ حوزه‌های انتخاب‌شده پاسخ دهید.");
      return;
    }
    if (!targetBehavior.trim()) {
      alert("لطفاً رفتار هدف را مشخص کنید.");
      return;
    }

    const form: FollowUp = {
      id: uuidv4(),
      childId: id!,
      teacherId: user.id,
      actionItemId: assignedActionId || undefined,
      formType: "FOLLOWUP",
      formVersion: "1.0.0",
      triggerReason,
      previousAssessmentId,
      previousAssessmentType,
      followUpNumber: 1, // Simplified, should be calculated on backend
      status: "SUBMITTED",
      targetDomains: targetDomains as FollowUp["targetDomains"],
      targetBehaviors: [targetBehavior],
      answers: requiredQuestionIds.map(questionId => ({ questionId, answerValue: answers[questionId] })),
      implementationLevel,
      nonImplementationReason,
      overallChange,
      effectiveness,
      problemStillExists,
      childDistress,
      impactOnLearning,
      impactOnPeers,
      impactOnTeacher,
      classManagementBurden,
      centerActionsDone,
      specialistServicesDone,
      newBehaviorObserved,
      newBehaviorDescription,
      newBehaviorKeywords: newBehaviorKeywordsText.split(/[،,]/).map(keyword => keyword.trim()).filter(Boolean).slice(0, 3),
      newBehaviorDate: newBehaviorDate || undefined,
      requiresImmediateReport,
      freeTextNotes,
      specialistDecision,
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/assessments/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Failed");
      alert("فرم فالوآپ با موفقیت ثبت شد.");
      navigate(user.role === "مربی" ? "/" : `/child/${id}`);
    } catch (err) {
      alert("خطا در ثبت فرم");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">در حال بارگذاری اطلاعات وظیفه...</div>;
  if (loadError || !child) return <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900"><p>{loadError || "پرونده کودک پیدا نشد."}</p><button type="button" onClick={() => navigate(-1)} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white">بازگشت</button></div>;
  const childClass = appData?.classes?.find(group => group.id === child.currentClassId);
  const childTeacher = appData?.users.find(item => item.id === childClass?.teacherId);
  const initialAssessment = [...(appData?.teacherAssessments || []), ...(appData?.parentAssessments || [])].find(form => form.id === previousAssessmentId);
  const followUpNumber = (appData?.followUps || []).filter(form => form.childId === child.id).length + 1;
  const canSetSpecialistDecision = ["ادمین", "تیم_تخصصی", "سرمربی"].includes(user.role);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-16 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">فرم فالوآپ (پیگیری) مربی</h2>
            <p className="text-sm text-gray-500">کودک: {child.firstName} {child.lastName} — {child.childId || child.id}</p>
            <p className="text-xs text-gray-500">مرکز: {appData?.centers.find(center => center.id === child.currentCenterId)?.name || "نامشخص"} | کلاس: {childClass?.name || "ثبت نشده"} | مربی: {childTeacher?.fullName || "نامشخص"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">اطلاعات پایه و هدف فالوآپ</h3>
          <p className="text-sm text-gray-500">توجه: در این فرم تنها میزان تغییرات در رفتارهای هدف را گزارش می‌کنید و نیازی به ارزیابی کامل مجدد نیست.</p>
          {user.role === "مربی" ? (
            <p className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-900">نتیجهٔ ارزیابی برای مربی نمایش داده نمی‌شود؛ مبنای مقایسه پس از ثبت فرم در سامانه تعیین می‌شود.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm md:grid-cols-4">
              <p>تاریخ ارزیابی اولیه: {initialAssessment ? new Date(initialAssessment.createdAt).toLocaleDateString("fa-IR") : "ثبت نشده"}</p>
              <p>شروع فالوآپ: {new Date().toLocaleDateString("fa-IR")}</p>
              <p>تکمیل فرم: هنگام ثبت</p>
              <p>نوبت فالوآپ: {followUpNumber}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">دلیل شروع فالوآپ</label>
              <select value={triggerReason} onChange={e => setTriggerReason(e.target.value as FollowUp["triggerReason"])} className="w-full rounded-lg border border-gray-300 p-2.5">
                {FOLLOW_UP_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حوزه‌های هدف (همهٔ حوزه‌های نیازمند پیگیری را انتخاب کنید)</label>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                {FOLLOW_UP_SCALES.map(scale => (
                  <label key={scale.domain} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                    <input type="checkbox" checked={targetDomains.includes(scale.domain)} onChange={event => setTargetDomains(current => event.target.checked ? [...current, scale.domain] : current.filter(domain => domain !== scale.domain))} className="rounded text-indigo-600" />
                    {scale.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رفتار هدف (چه رفتاری را پیگیری می‌کنید؟)</label>
              <input type="text" value={targetBehavior} onChange={e => setTargetBehavior(e.target.value)} placeholder="مثال: پرخاشگری فیزیکی هنگام گرفتن اسباب‌بازی" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500" required />
            </div>
          </div>
        </div>

        {targetDomains.length > 0 && (
          <div className="bg-white border rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۴. گویه‌های اختصاصی حوزه هدف</h3>
              <p className="mt-3 text-sm text-gray-600">پنج گویهٔ هر یک از حوزه‌های انتخاب‌شده نمایش داده می‌شود. پاسخ‌ها بر اساس مقیاس فرم مربی نمره‌گذاری می‌شوند؛ برای این بخش نمرهٔ کل محاسبه نمی‌شود.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {FOLLOW_UP_SCALES.filter(scale => targetDomains.includes(scale.domain)).map(scale => (
                <section key={scale.domain} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <h4 className="font-bold text-gray-800">{scale.label}</h4>
                  {scale.questions.map(questionId => (
                    <div key={questionId} className="rounded-lg bg-gray-50 p-4 space-y-3">
                      <p className="text-sm font-medium text-gray-900"><span className="ml-2 text-indigo-700">گویه {questionId}</span>{FOLLOW_UP_QUESTIONS[questionId - 1]}</p>
                      <div className="flex flex-wrap gap-2">
                        {[{ value: 0, label: "درست نیست" }, { value: 1, label: "تا حدی درست است" }, { value: 2, label: "کاملاً درست است" }].map(option => (
                          <label key={option.value} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium ${answers[questionId] === option.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>
                            <input type="radio" name={`followup-q-${questionId}`} value={option.value} checked={answers[questionId] === option.value} onChange={() => setAnswers(current => ({ ...current, [questionId]: option.value }))} className="sr-only" />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۶. اقدامات مرکز و خدمات تخصصی</h3>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-800">از ارزیابی قبلی تاکنون چه اقداماتی در مرکز انجام شده است؟</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CENTER_ACTION_OPTIONS.map(action => <label key={action} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={centerActionsDone.includes(action)} onChange={e => setCenterActionsDone(current => e.target.checked ? [...current, action] : current.filter(value => value !== action))} />{action}</label>)}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-800">خدمات تخصصی دریافت‌شده و وضعیت هر خدمت</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {SPECIALIST_SERVICES.map(service => {
                const current = specialistServicesDone.find(item => item.service === service);
                return <div key={service} className="flex items-center gap-3 rounded border p-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(current)} onChange={e => setSpecialistServicesDone(items => e.target.checked ? [...items, { service, status: "وضعیت نامشخص" }] : items.filter(item => item.service !== service))} />{service}</label>
                  {current && <select aria-label={`وضعیت ${service}`} value={current.status} onChange={e => setSpecialistServicesDone(items => items.map(item => item.service === service ? { ...item, status: e.target.value as typeof current.status } : item))} className="rounded border p-1 text-xs">{SERVICE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select>}
                </div>;
              })}
            </div>
          </fieldset>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۷. میزان اجرای راهکارها</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">در فاصله بین ارزیابی قبل تا امروز، راهکارهای توافق‌شده تا چه حد در کلاس اجرا شدند؟</label>
              <select value={implementationLevel} onChange={e => setImplementationLevel(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="به طور کامل اجرا شده‌اند.">به طور کامل اجرا شده‌اند.</option>
                <option value="تا حدی اجرا شده‌اند.">تا حدی اجرا شده‌اند.</option>
                <option value="به میزان کم اجرا شده‌اند.">به میزان کم اجرا شده‌اند.</option>
                <option value="اجرا نشده‌اند.">اجرا نشده‌اند.</option>
                <option value="هنوز راهکاری پیشنهاد نشده است.">هنوز راهکاری پیشنهاد نشده است.</option>
                <option value="اطلاعی ندارم.">اطلاعی ندارم.</option>
              </select>
            </div>
            {(implementationLevel === "به میزان کم اجرا شده‌اند." || implementationLevel === "اجرا نشده‌اند.") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">علت اجرا نشدن یا اجرای کم راهکار</label>
                <select value={nonImplementationReason || ""} onChange={e => setNonImplementationReason((e.target.value || undefined) as FollowUp["nonImplementationReason"])} className="w-full rounded-lg border border-gray-300 p-2 text-sm">
                  <option value="">انتخاب علت</option><option value="شرایط کلاس و مرکز فراهم نبود.">شرایط کلاس و مرکز فراهم نبود.</option><option value="امکان همکاری خانواده فراهم نبود.">امکان همکاری خانواده فراهم نبود.</option><option value="توقف حضور نوآموز در مرکز رخ داد.">توقف حضور نوآموز در مرکز رخ داد.</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۵، ۸ و ۹. تغییرات، اثربخشی و وضعیت فعلی</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تغییر کلی در رفتار هدف</label>
              <select value={overallChange} onChange={e => setOverallChange(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="خیلی بهتر شده است.">خیلی بهتر شده است.</option>
                <option value="کمی بهتر شده است.">کمی بهتر شده است.</option>
                <option value="تقریباً مانند قبل است.">تقریباً مانند قبل است.</option>
                <option value="کمی بدتر شده است.">کمی بدتر شده است.</option>
                <option value="خیلی بدتر شده است.">خیلی بدتر شده است.</option>
                <option value="امکان مقایسه ندارم.">امکان مقایسه ندارم.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">میزان اثربخشی راهکارها</label>
              <select value={effectiveness} onChange={e => setEffectiveness(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option>
                <option value="هنوز اقدامی انجام نشده است.">هنوز اقدامی انجام نشده است.</option>
                <option value="برای قضاوت زود است.">برای قضاوت زود است.</option>
                <option value="اطلاعی ندارم.">اطلاعی ندارم.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">آیا مشکل هدف هنوز وجود دارد؟</label>
              <select value={problemStillExists} onChange={e => setProblemStillExists(e.target.value as NonNullable<FollowUp["problemStillExists"]>)} className="w-full rounded-lg border border-gray-300 p-2 text-sm"><option value="خیر">خیر</option><option value="بله، به میزان کم">بله، به میزان کم</option><option value="بله، به میزان قابل توجه">بله، به میزان قابل توجه</option><option value="بله، به میزان زیاد">بله، به میزان زیاد</option></select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">میزان پریشانی یا ناراحتی فعلی کودک</label>
              <select value={childDistress} onChange={e => setChildDistress(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اثر فعلی بر یادگیری و فعالیت‌های کلاس</label>
              <select value={impactOnLearning} onChange={e => setImpactOnLearning(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">اثر فعلی بر ارتباط با همسالان</label><select value={impactOnPeers} onChange={e => setImpactOnPeers(e.target.value as any)} className="w-full rounded-lg border border-gray-300 p-2 text-sm"><option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">اثر فعلی بر ارتباط با مربی</label><select value={impactOnTeacher} onChange={e => setImpactOnTeacher(e.target.value as any)} className="w-full rounded-lg border border-gray-300 p-2 text-sm"><option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">دشواری تعامل با کودک برای مربی یا کلاس</label><select value={classManagementBurden} onChange={e => setClassManagementBurden(e.target.value as any)} className="w-full rounded-lg border border-gray-300 p-2 text-sm"><option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option></select></div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۱۰. رفتار یا نشانه جدید</h3>
          
          <div>
            <label className="flex items-center gap-2 font-medium text-gray-900 cursor-pointer">
              <input type="checkbox" checked={newBehaviorObserved} onChange={e => setNewBehaviorObserved(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              آیا در این مدت رفتار یا مشکل جدیدی در کودک مشاهده کرده‌اید؟
            </label>
          </div>
          
          {newBehaviorObserved && (
            <div className="space-y-4 pl-6 border-r-2 border-indigo-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حداکثر سه واژه کلیدی (با ویرگول جدا کنید)</label>
                <input value={newBehaviorKeywordsText} onChange={e => setNewBehaviorKeywordsText(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2 text-sm" />
                <label className="mt-3 block text-sm font-medium text-gray-700 mb-1">توضیح کوتاه (حداکثر ۱۵۰ نویسه)</label>
                <textarea maxLength={150} value={newBehaviorDescription} onChange={e => setNewBehaviorDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500" rows={2} required={newBehaviorObserved}></textarea>
                <label className="mt-3 block text-sm font-medium text-gray-700 mb-1">تاریخ تقریبی شروع</label>
                <input value={newBehaviorDate} onChange={e => setNewBehaviorDate(e.target.value)} placeholder="مثال: ۱۴۰۵/۰۶/۰۱" className="w-full rounded-lg border border-gray-300 p-2 text-sm md:w-1/2" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-red-600 cursor-pointer">
                <input type="checkbox" checked={requiresImmediateReport} onChange={e => setRequiresImmediateReport(e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                این رفتار جدید نگران‌کننده است و نیاز به بررسی فوری دارد.
              </label>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۱۱. توضیح تکمیلی</h3>
          <label className="block text-sm font-medium text-gray-700">یادداشت کوتاه درباره تغییرات کودک یا اجرای راهکارها (حداکثر ۲۰۰ نویسه)
            <textarea maxLength={200} rows={3} value={freeTextNotes} onChange={e => setFreeTextNotes(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 p-3" />
          </label>
        </div>

        {canSetSpecialistDecision && <div className="bg-white border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۱۲. تصمیم سرمربی یا تیم تخصصی</h3>
          <select value={specialistDecision || ""} onChange={e => setSpecialistDecision((e.target.value || undefined) as FollowUp["specialistDecision"])} className="w-full rounded-lg border border-gray-300 p-2.5">
            <option value="">ثبت نشده</option><option value="پایان فالوآپ و بازگشت به پایش معمول">پایان فالوآپ و بازگشت به پایش معمول</option><option value="ادامه فالوآپ در همین حوزه">ادامه فالوآپ در همین حوزه</option><option value="پیگیری حوزه دیگری">پیگیری حوزه دیگری</option><option value="راهنمایی بیشتر مربی">راهنمایی بیشتر مربی</option><option value="بررسی سرمربی">بررسی سرمربی</option><option value="گفت‌وگو با خانواده">گفت‌وگو با خانواده</option><option value="بررسی تیم تخصصی">بررسی تیم تخصصی</option><option value="پیگیری خدمات یا ارجاع قبلی">پیگیری خدمات یا ارجاع قبلی</option><option value="نیاز به اقدام سریع">نیاز به اقدام سریع</option>
          </select>
        </div>}

        <div className="flex justify-end">
          <button type="submit" className="flex items-center gap-2 py-3 px-8 rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            <CheckCircle2 className="w-5 h-5" />
            ثبت فرم فالوآپ
          </button>
        </div>
      </form>
    </div>
  );
}
