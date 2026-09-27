import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { User, FollowUp, Child } from "../types";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { fetchData } from "../api";
import { FOLLOW_UP_QUESTIONS, FOLLOW_UP_SCALES } from "../followUpScales";

export function FollowUpForm({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [previousAssessmentId, setPreviousAssessmentId] = useState("");
  const [availableTargetDomains, setAvailableTargetDomains] = useState<FollowUp["targetDomains"]>(FOLLOW_UP_SCALES.map(scale => scale.domain));
  const [targetDomains, setTargetDomains] = useState<FollowUp["targetDomains"]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [targetBehavior, setTargetBehavior] = useState("");
  const [implementationLevel, setImplementationLevel] = useState<FollowUp["implementationLevel"]>("به میزان متوسط اجرا شده‌اند.");
  const [overallChange, setOverallChange] = useState<FollowUp["overallChange"]>("تغییر محسوسی نکرده است.");
  const [effectiveness, setEffectiveness] = useState<FollowUp["effectiveness"]>("برای قضاوت زود است.");
  const [childDistress, setChildDistress] = useState<FollowUp["childDistress"]>("تغییری نکرده است.");
  const [impactOnLearning, setImpactOnLearning] = useState<FollowUp["impactOnLearning"]>("تغییری نکرده است.");
  const [impactOnPeers, setImpactOnPeers] = useState<FollowUp["impactOnPeers"]>("تغییری نکرده است.");
  const [newBehaviorObserved, setNewBehaviorObserved] = useState(false);
  const [newBehaviorDescription, setNewBehaviorDescription] = useState("");
  const [requiresImmediateReport, setRequiresImmediateReport] = useState(false);
  const [barriersToImplementation, setBarriersToImplementation] = useState("");

  useEffect(() => {
    fetchData().then(data => {
      const c = data.children.find(ch => ch.id === id);
      if (c) setChild(c);
      
      // Auto-select latest teacher assessment as target if none selected
      const teacherForms = data.teacherAssessments.filter(a => a.childId === id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (teacherForms.length > 0) {
        setPreviousAssessmentId(teacherForms[0].id);
        const needsFollowUp = teacherForms[0].score?.subscales.filter(scale => scale.level !== "بهنجار").map(scale => {
          return FOLLOW_UP_SCALES.find(item => item.key === scale.domain)?.domain;
        }).filter((domain): domain is NonNullable<typeof domain> => Boolean(domain)) || [];
        setAvailableTargetDomains(needsFollowUp);
      }
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetDomains.length === 0 || targetDomains.length > 2) {
      alert("لطفاً یک یا حداکثر دو حوزه هدف انتخاب کنید.");
      return;
    }
    const requiredQuestionIds: number[] = [...new Set<number>(targetDomains.flatMap((domain): number[] => {
      const scale = FOLLOW_UP_SCALES.find(item => item.domain === domain);
      return scale ? [...scale.questions] : [];
    }))];
    if (requiredQuestionIds.some(questionId => answers[questionId] === undefined)) {
      alert("لطفاً به هر پنج گویه هر حوزه انتخاب‌شده پاسخ دهید.");
      return;
    }
    if (!targetBehavior) {
      alert("لطفاً رفتار هدف را مشخص کنید.");
      return;
    }

    const form: FollowUp = {
      id: uuidv4(),
      childId: id!,
      teacherId: user.id,
      formType: "FOLLOWUP",
      formVersion: "1.0.0",
      triggerReason: "پیگیری پس از ارائه راهکار",
      previousAssessmentId,
      followUpNumber: 1, // Simplified, should be calculated on backend
      status: "SUBMITTED",
      targetDomains: targetDomains as FollowUp["targetDomains"],
      targetBehaviors: [targetBehavior],
      answers: requiredQuestionIds.map(questionId => ({ questionId, answerValue: answers[questionId] })),
      implementationLevel,
      nonImplementationReason: barriersToImplementation as any,
      overallChange,
      effectiveness,
      childDistress,
      impactOnLearning,
      impactOnPeers,
      newBehaviorObserved,
      newBehaviorDescription,
      requiresImmediateReport,
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
      navigate(`/child/${id}`);
    } catch (err) {
      alert("خطا در ثبت فرم");
    }
  };

  if (!child) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-16 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">فرم فالوآپ (پیگیری) مربی</h2>
            <p className="text-sm text-gray-500">کودک: {child.firstName} {child.lastName}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">اطلاعات پایه و هدف فالوآپ</h3>
          <p className="text-sm text-gray-500">توجه: در این فرم تنها میزان تغییرات در رفتارهای هدف را گزارش می‌کنید و نیازی به ارزیابی کامل مجدد نیست.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حوزه هدف (حداکثر دو حوزه)</label>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                {FOLLOW_UP_SCALES.filter(scale => availableTargetDomains.includes(scale.domain)).map(scale => (
                  <label key={scale.domain} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                    <input type="checkbox" checked={targetDomains.includes(scale.domain)} disabled={!targetDomains.includes(scale.domain) && targetDomains.length >= 2} onChange={event => setTargetDomains(current => event.target.checked ? [...current, scale.domain] : current.filter(domain => domain !== scale.domain))} className="rounded text-indigo-600" />
                    {scale.label}
                  </label>
                ))}
                {availableTargetDomains.length === 0 && <p className="text-sm text-amber-700">در ارزیابی قبلی حوزه‌ای برای فالوآپ مشخص نشده است.</p>}
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
              <p className="mt-3 text-sm text-gray-600">فقط پنج گویه مربوط به حوزه انتخاب‌شده نمایش داده می‌شود. پاسخ‌ها بر اساس مقیاس فرم مربی نمره‌گذاری می‌شوند؛ برای این بخش نمره کل محاسبه نمی‌شود.</p>
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

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۱. میزان اجرای راهکارها</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">در فاصله بین ارزیابی قبل تا امروز، راهکارهای توافق‌شده تا چه حد در کلاس اجرا شدند؟</label>
              <select value={implementationLevel} onChange={e => setImplementationLevel(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="به طور کامل اجرا شده‌اند.">به طور کامل اجرا شده‌اند.</option>
                <option value="به میزان متوسط اجرا شده‌اند.">به میزان متوسط اجرا شده‌اند.</option>
                <option value="به میزان کم اجرا شده‌اند.">به میزان کم اجرا شده‌اند.</option>
                <option value="اجرا نشده‌اند.">اجرا نشده‌اند.</option>
              </select>
            </div>
            {(implementationLevel === "به میزان کم اجرا شده‌اند." || implementationLevel === "اجرا نشده‌اند.") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">چه موانعی باعث شد راهکارها اجرا نشوند؟</label>
                <textarea value={barriersToImplementation} onChange={e => setBarriersToImplementation(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500" rows={2}></textarea>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۲. ارزیابی تغییرات</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تغییر کلی در رفتار هدف</label>
              <select value={overallChange} onChange={e => setOverallChange(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="خیلی بهتر شده است.">خیلی بهتر شده است.</option>
                <option value="کمی بهتر شده است.">کمی بهتر شده است.</option>
                <option value="تغییر محسوسی نکرده است.">تغییر محسوسی نکرده است.</option>
                <option value="کمی بدتر شده است.">کمی بدتر شده است.</option>
                <option value="خیلی بدتر شده است.">خیلی بدتر شده است.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">میزان اثربخشی راهکارها</label>
              <select value={effectiveness} onChange={e => setEffectiveness(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="راهکارها بسیار مؤثر بوده‌اند.">راهکارها بسیار مؤثر بوده‌اند.</option>
                <option value="تأثیر نسبی داشته‌اند.">تأثیر نسبی داشته‌اند.</option>
                <option value="تأثیر نداشته‌اند.">تأثیر نداشته‌اند.</option>
                <option value="تأثیر منفی داشته‌اند.">تأثیر منفی داشته‌اند.</option>
                <option value="برای قضاوت زود است.">برای قضاوت زود است.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">میزان پریشانی و ناراحتی کودک</label>
              <select value={childDistress} onChange={e => setChildDistress(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="کاهش یافته است.">کاهش یافته است.</option>
                <option value="تغییری نکرده است.">تغییری نکرده است.</option>
                <option value="افزایش یافته است.">افزایش یافته است.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تأثیر بر یادگیری و فعالیت‌های کلاس</label>
              <select value={impactOnLearning} onChange={e => setImpactOnLearning(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-indigo-500">
                <option value="کاهش یافته است.">بهبود یافته است (کاهش تأثیر منفی).</option>
                <option value="تغییری نکرده است.">تغییری نکرده است.</option>
                <option value="افزایش یافته است.">بدتر شده است (افزایش تأثیر منفی).</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-900 border-b pb-2">۳. نشانه‌های جدید</h3>
          
          <div>
            <label className="flex items-center gap-2 font-medium text-gray-900 cursor-pointer">
              <input type="checkbox" checked={newBehaviorObserved} onChange={e => setNewBehaviorObserved(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
              آیا در این مدت رفتار یا مشکل جدیدی در کودک مشاهده کرده‌اید؟
            </label>
          </div>
          
          {newBehaviorObserved && (
            <div className="space-y-4 pl-6 border-r-2 border-indigo-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیح رفتار جدید</label>
                <textarea value={newBehaviorDescription} onChange={e => setNewBehaviorDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500" rows={2} required={newBehaviorObserved}></textarea>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-red-600 cursor-pointer">
                <input type="checkbox" checked={requiresImmediateReport} onChange={e => setRequiresImmediateReport(e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                این رفتار جدید نگران‌کننده است و نیاز به بررسی فوری دارد.
              </label>
            </div>
          )}
        </div>

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
