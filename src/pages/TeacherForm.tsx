import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { User, TeacherAssessment, AssessmentAnswer } from "../types";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { fetchData, submitTeacherForm } from "../api";
import { calculateExactAge } from "../utils/ageCalculator";
import { ALL_TEACHER_SCENARIOS, TEACHER_SCENARIOS, TEACHER_SCENARIO_DOMAIN_BY_ID, TeacherScenarioDomain } from "../domain/teacherScenarios";

const QUESTIONS = [
  "احساسات دیگران را درک و رعایت می‌کند.",
  "بی‌قرار است و نمی‌تواند مدت زیادی یک‌جا آرام بگیرد.",
  "اغلب از سردرد، دل‌درد یا حالت تهوع شکایت می‌کند.",
  "وسایل یا خوراکی‌های خود را با دیگران تقسیم می‌کند.",
  "اغلب زود از کوره در می‌رود و سر و صدا یا دعوا راه می‌اندازد.",
  "تقریباً گوشه‌گیر است و بیشتر تنهایی بازی می‌کند.",
  "معمولاً از بزرگ‌ترها حرف‌شنوی دارد و آنچه را از او خواسته می‌شود انجام می‌دهد.",
  "نگرانی‌های زیادی دارد و اغلب نگران به نظر می‌رسد.",
  "اگر کسی صدمه دیده، ناراحت یا بیمار باشد، به او کمک می‌کند.",
  "دائماً در حال حرکت است و وول می‌خورد و می‌جنبد.",
  "حداقل یک دوست خوب دارد.",
  "اغلب با بچه‌های دیگر دعوا می‌کند یا به آن‌ها زور می‌گوید.",
  "اغلب غمگین، دل‌گرفته یا گریان است.",
  "معمولاً بچه‌های دیگر او را دوست دارند.",
  "زود حواسش پرت می‌شود و تمرکز خود را از دست می‌دهد.",
  "در موقعیت‌های جدید مضطرب می‌شود، به دیگران می‌چسبد یا اعتمادبه‌نفس خود را زود از دست می‌دهد.",
  "با بچه‌های کوچک‌تر مهربان است.",
  "اغلب دروغ می‌گوید، حقه‌بازی می‌کند یا با بزرگ‌ترها بحث و جدل می‌کند.",
  "بچه‌های دیگر سر به سر او می‌گذارند یا به او زور می‌گویند.",
  "اغلب داوطلب می‌شود به دیگران کمک کند (مانند مربیان یا سایر کودکان).",
  "پیش از انجام کارها، معمولاً به آن فکر می‌کند.",
  "گاهی با رفتارهای خود باعث آزار دیگران می‌شود یا وسایل دیگران را بدون اجازه برمی‌دارد.",
  "با بزرگ‌ترها بهتر کنار می‌آید تا با هم‌سن‌وسالان خود.",
  "ترس‌های فراوانی دارد و خیلی زود وحشت می‌کند.",
  "کارهایش را تا پایان انجام می‌دهد و دقت و توجه خوبی دارد."
];

export function TeacherForm({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childContext, setChildContext] = useState("");

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [familiarityDuration, setFamiliarityDuration] = useState<TeacherAssessment["familiarityDuration"] | "">("");
  
  const [overallProblem, setOverallProblem] = useState<TeacherAssessment["overallProblem"]>("خیر");
  const [problemAreas, setProblemAreas] = useState<Record<string, "کمی" | "قطعا" | "خیلی">>({});
  
  const [durationOfProblem, setDurationOfProblem] = useState<TeacherAssessment["durationOfProblem"]>("کمتر از یک ماه");
  const [childDistressLevel, setChildDistressLevel] = useState<TeacherAssessment["childDistressLevel"]>("خیر");
  const [impactOnPeerRelations, setImpactOnPeerRelations] = useState<TeacherAssessment["impactOnPeerRelations"]>("خیر");
  const [impactOnLearning, setImpactOnLearning] = useState<TeacherAssessment["impactOnLearning"]>("خیر");
  const [burdenOnTeacherOrClass, setBurdenOnTeacherOrClass] = useState<TeacherAssessment["burdenOnTeacherOrClass"]>("خیر");

  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, string>>({});
  
  const [freeTextNotes, setFreeTextNotes] = useState("");
  const [error, setError] = useState("");
  const [editingAssessment, setEditingAssessment] = useState<TeacherAssessment | null>(null);

  useEffect(() => {
    fetchData().then(data => {
      const c = data.children.find(ch => ch.id === id);
      if (c) {
        setChildName(`${c.firstName} ${c.lastName}`);
        const center = data.centers.find(item => item.id === c.currentCenterId);
        const childClass = data.classes?.find(item => item.id === c.currentClassId);
        setChildContext([c.gender, c.currentStage, center?.name, center?.region, childClass?.name].filter(Boolean).join(" — "));
        const age = calculateExactAge(c.birthDate);
        setChildAge(age ? age.formatted : "نامشخص");
      }
      if (editId) {
        const assessment = data.teacherAssessments?.find(form => form.id === editId && form.childId === id);
        const canManageForms = ["ادمین", "تیم_تخصصی", "سرمربی"].includes(user.role);
        if (!assessment || (user.role === "مربی" && assessment.teacherId !== user.id) || (user.role !== "مربی" && !canManageForms)) {
          setError("این فرم پیدا نشد یا شما اجازهٔ ویرایش آن را ندارید.");
          return;
        }
        setEditingAssessment(assessment);
        setAnswers(Object.fromEntries((assessment.answers || []).map(answer => [Number(answer.questionId), Number(answer.answerValue)])));
        setFamiliarityDuration(assessment.familiarityDuration);
        setOverallProblem(assessment.overallProblem);
        setProblemAreas(Object.fromEntries((assessment.problemAreas || []).map(area => [area.domain, area.severity])));
        setDurationOfProblem(assessment.durationOfProblem || "کمتر از یک ماه");
        setChildDistressLevel(assessment.childDistressLevel || "خیر");
        setImpactOnPeerRelations(assessment.impactOnPeerRelations || "خیر");
        setImpactOnLearning(assessment.impactOnLearning || "خیر");
        setBurdenOnTeacherOrClass(assessment.burdenOnTeacherOrClass || "خیر");
        setScenarioAnswers(Object.fromEntries((assessment.scenarios || []).map(scenario => [scenario.scenarioId, scenario.selectedOption])));
        setFreeTextNotes(assessment.freeTextNotes || "");
      }
    }).catch(() => setError("بارگذاری فرم ناموفق بود. دوباره تلاش کنید."));
  }, [id, editId, user.id, user.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId && !editingAssessment) return;
    
    if (Object.keys(answers).length < 25) {
      setError(`لطفاً به همه ۲۵ سوال اصلی پاسخ دهید.`);
      window.scrollTo(0, 0);
      return;
    }
    if (!familiarityDuration) {
      setError("لطفاً مدت آشنایی خود با کودک را مشخص کنید.");
      window.scrollTo(0, 0);
      return;
    }

    const selectedDomains = overallProblem === "خیر"
      ? []
      : Object.keys(problemAreas) as TeacherScenarioDomain[];
    if (overallProblem !== "خیر" && selectedDomains.length === 0) {
      setError("لطفاً حوزه یا حوزه‌هایی را که در آن‌ها مشکل مشاهده شده انتخاب کنید.");
      window.scrollTo(0, 0);
      return;
    }

    const requiredScenarioIds = selectedDomains.flatMap(domain =>
      TEACHER_SCENARIOS[domain].map(scenario => scenario.id)
    );
    const missingScenarioCount = requiredScenarioIds.filter(scenarioId => !scenarioAnswers[scenarioId]).length;
    if (missingScenarioCount > 0) {
      setError(`لطفاً به همهٔ ${requiredScenarioIds.length} سؤال مشاهدهٔ موقعیتی در حوزه‌های انتخاب‌شده پاسخ دهید. ${missingScenarioCount} سؤال باقی مانده است.`);
      window.scrollTo(0, 0);
      return;
    }

    const formAnswers: AssessmentAnswer[] = Object.entries(answers).map(([qId, val]) => ({
      questionId: Number(qId),
      answerValue: val
    }));

    const formattedProblemAreas = (overallProblem === "خیر" ? [] : Object.entries(problemAreas))
      .map(([domain, severity]) => ({ domain, severity: severity as "کمی" | "قطعا" | "خیلی" }));

    const selectedDomainSet = new Set(selectedDomains);
    const formattedScenarios = Object.entries(scenarioAnswers)
      .filter(([scenarioId, option]) => option && selectedDomainSet.has(TEACHER_SCENARIO_DOMAIN_BY_ID[scenarioId]))
      .map(([scenarioId, option]) => {
        const domain = TEACHER_SCENARIO_DOMAIN_BY_ID[scenarioId];
        const scenario = ALL_TEACHER_SCENARIOS.find(item => item.id === scenarioId);
        return { domain, scenarioId, scenarioText: scenario?.text, selectedOption: option as string };
      });

    const form: TeacherAssessment = {
      id: editingAssessment?.id || uuidv4(),
      childId: id!,
      teacherId: editingAssessment?.teacherId || user.id,
      centerId: editingAssessment?.centerId || user.centerIds[0] || "",
      formType: "TPCS",
      formVersion: "1.0.0",
      status: "SUBMITTED",
      childAgeAtAssessment: childAge,
      familiarityDuration: familiarityDuration as TeacherAssessment["familiarityDuration"],
      answers: formAnswers,
      overallProblem,
      problemAreas: formattedProblemAreas,
      durationOfProblem,
      childDistressLevel,
      impactOnPeerRelations,
      impactOnLearning,
      burdenOnTeacherOrClass,
      scenarios: formattedScenarios,
      freeTextNotes,
      createdAt: editingAssessment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/forms/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "ثبت فرم ناموفق بود.");
      navigate(user.role === "مربی" ? "/assessments/mine" : `/child/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت فرم ناموفق بود.");
    }
  };

  if (editId && !editingAssessment) {
    return <div className="mx-auto max-w-3xl p-8 text-center text-gray-600">{error || "در حال بارگذاری فرم برای ویرایش..."}<div><Link className="mt-4 inline-flex text-indigo-600 hover:underline" to={user.role === "مربی" ? "/assessments/mine" : `/child/${id}`}>بازگشت</Link></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <Link to={user.role === "مربی" ? "/assessments/mine" : `/child/${id}`} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{editingAssessment ? "ویرایش فرم دیدگاه مربی (TPCS)" : "فرم دیدگاه مربی (TPCS)"}</h2>
          <p className="text-sm text-gray-500 mt-1">کودک: {childName} — {childContext} — سن: {childAge}</p>
          <p className="text-xs text-gray-500 mt-1">مربی: {user.fullName} — تاریخ تکمیل: {new Date().toLocaleDateString("fa-IR")} — بر اساس مشاهدات سه ماه گذشته پاسخ دهید.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
          <label className="block text-sm font-medium text-gray-900">چه مدتی است کودک را در محیط آموزشی می‌شناسید؟</label>
          <select required value={familiarityDuration} onChange={e => setFamiliarityDuration(e.target.value as TeacherAssessment["familiarityDuration"] | "")} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 md:w-1/2">
            <option value="">انتخاب مدت آشنایی</option><option value="کمتر از یک ماه">کمتر از یک ماه</option><option value="۱ تا ۳ ماه">۱ تا ۳ ماه</option><option value="بیش از ۳ ماه">بیش از ۳ ماه</option>
          </select>
        </div>
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-indigo-900 border-b border-indigo-100 pb-2">۱. بخش سوالات اصلی</h3>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {QUESTIONS.map((q, idx) => {
              const qId = idx + 1;
              const val = answers[qId];
              return (
                <div key={qId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {qId}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{q}</span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: "درست نیست", v: 0 },
                      { label: "تا حدی درست است", v: 1 },
                      { label: "کاملاً درست است", v: 2 }
                    ].map(opt => (
                      <label key={opt.v} className={`flex-1 flex justify-center items-center px-3 py-2 border rounded-lg text-xs font-medium cursor-pointer ${val === opt.v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" name={`q${qId}`} onChange={() => setAnswers({...answers, [qId]: opt.v})} checked={val === opt.v} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-indigo-900 border-b border-indigo-100 pb-2">۲. بخش تکمیلی و تأثیر مشکلات (سوال ۲۶ به بعد)</h3>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <label className="block font-medium text-gray-900 mb-2">۲۶. به طور کلی، آیا فکر می‌کنید این کودک در زمینه‌های احساسات، تمرکز، رفتار یا تعامل مشکل دارد؟</label>
              <select value={overallProblem} onChange={e => setOverallProblem(e.target.value as any)} className="w-full border-gray-300 rounded-lg p-3 border">
                <option value="خیر">خیر</option>
                <option value="بله، کمی مشکل دارد.">بله، کمی مشکل دارد.</option>
                <option value="بله، قطعاً مشکل دارد.">بله، قطعاً مشکل دارد.</option>
                <option value="بله، خیلی مشکل دارد.">بله، خیلی مشکل دارد.</option>
              </select>
            </div>

            {overallProblem !== "خیر" && (
              <div className="space-y-6 p-4 bg-gray-50 rounded-xl border">
                <h4 className="font-bold text-gray-800">مشخص کنید مشکل در کدام یک از حوزه‌های زیر وجود دارد و شدت آن چقدر است:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {["احساسات", "تمرکز و توجه", "رفتار", "تعامل با دیگران"].map(domain => (
                    <div key={domain} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <span className="text-sm font-medium">{domain}</span>
                      <select 
                        className="text-sm border-gray-300 rounded border p-1"
                        value={problemAreas[domain] || ""}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            const newAreas = {...problemAreas};
                            delete newAreas[domain];
                            setProblemAreas(newAreas);
                          } else {
                            setProblemAreas({...problemAreas, [domain]: val as any});
                          }
                        }}
                      >
                        <option value="">بدون مشکل</option>
                        <option value="کمی">کمی</option>
                        <option value="قطعا">قطعاً</option>
                        <option value="خیلی">خیلی</option>
                      </select>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">۲۷. چه مدت است این مشکلات وجود دارد؟</label>
                    <select value={durationOfProblem} onChange={e => setDurationOfProblem(e.target.value as any)} className="w-full rounded-lg p-2.5 border">
                      <option value="کمتر از یک ماه">کمتر از یک ماه</option><option value="۱ تا ۳ ماه">۱ تا ۳ ماه</option><option value="۴ تا ۶ ماه">۴ تا ۶ ماه</option><option value="بیش از یک سال">بیش از یک سال</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">۲۸. ناراحتی یا پریشانی کودک:</label>
                    <select value={childDistressLevel} onChange={e => setChildDistressLevel(e.target.value as any)} className="w-full rounded-lg p-2.5 border">
                      <option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-900">۲۹ و ۳۰. تأثیر مشکل بر عملکردهای روزمره:</label>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[{ l: "ارتباط با همسالان", v: impactOnPeerRelations, fn: setImpactOnPeerRelations },
                      { l: "یادگیری", v: impactOnLearning, fn: setImpactOnLearning },
                      { l: "مدیریت کلاس (باری بر دوش مربی)", v: burdenOnTeacherOrClass, fn: setBurdenOnTeacherOrClass }].map(it => (
                      <div key={it.l} className="bg-white p-3 rounded-lg border">
                        <div className="text-xs text-gray-500 mb-2">{it.l}</div>
                        <select value={it.v} onChange={e => it.fn(e.target.value as any)} className="w-full border-gray-300 rounded text-sm p-1 border">
                          <option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {overallProblem !== "خیر" && Object.keys(problemAreas).length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-indigo-900 border-b border-indigo-100 pb-2">۳. مشاهدات مهم مربی (Situational Judgment)</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800 text-sm">
              بر اساس حوزه‌هایی که مشخص کردید مشکل وجود دارد، لطفاً سناریوهای زیر را پاسخ دهید. نیازی به نمره‌گذاری نیست.
            </div>
            
            {Object.keys(problemAreas).map(domainName => {
              const domain = domainName as TeacherScenarioDomain;
              const scenarios = TEACHER_SCENARIOS[domain];

              return (
                <div key={domain} className="space-y-4">
                  <h4 className="font-bold text-lg text-gray-800 bg-gray-100 p-2 rounded">حوزه: {domain} <span className="text-sm font-normal text-gray-500">({scenarios.length} سؤال)</span></h4>
                  {scenarios.map((sc, index) => (
                    <div key={sc.id} className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                      <p className="font-medium text-gray-900 text-sm"><span className="ml-2 text-xs text-gray-500">سؤال {index + 1} از {scenarios.length}</span>{sc.text}</p>
                      <div className="space-y-2">
                        {sc.options.map((opt, i) => (
                          <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${scenarioAnswers[sc.id] === opt ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`}>
                            <input type="radio" name={sc.id} className="mt-1" checked={scenarioAnswers[sc.id] === opt} onChange={() => setScenarioAnswers(previous => ({...previous, [sc.id]: opt}))} />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-5">
          <label htmlFor="teacher-observations" className="block text-sm font-bold text-indigo-900">یادداشت مشاهدات مربی</label>
          <p className="text-xs text-gray-600">اگر نکتهٔ مشخصی از رفتار کودک در کلاس مشاهده کرده‌اید، کوتاه و بدون درج اطلاعات حساس بنویسید.</p>
          <textarea id="teacher-observations" value={freeTextNotes} onChange={event => setFreeTextNotes(event.target.value.slice(0, 200))} rows={4} maxLength={200} className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm" placeholder="مشاهدات تکمیلی مربی..." />
          <p className="text-left text-xs text-gray-500">{freeTextNotes.length} از ۲۰۰ نویسه</p>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" className="flex items-center gap-2 py-3 px-8 rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            <CheckCircle2 className="w-5 h-5" />
            {editingAssessment ? "ذخیره ویرایش فرم" : "ثبت نهایی فرم"}
          </button>
        </div>
      </form>
    </div>
  );
}
