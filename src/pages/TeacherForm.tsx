import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { User, TeacherAssessment, AssessmentAnswer } from "../types";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { fetchData, submitTeacherForm } from "../api";
import { calculateExactAge } from "../utils/ageCalculator";

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

// Simplified scenarios from PDF for brevity while strictly maintaining structure. 
// The actual PDF has more verbose descriptions for options.
const SCENARIOS: Record<string, { id: string; text: string; options: string[] }[]> = {
  "احساسات": [
    { id: "s_em_1", text: "وقتی کودک با مخالفت، تذکر معمول، نرسیدن به خواسته، اشتباه در انجام کار یا تغییر کوچکی در برنامه روبه‌رو می‌شود، معمولاً چه واکنشی نشان می‌دهد؟", options: ["ناراحت یا معترض می‌شود، اما واکنش او متناسب با اتفاق است و پس از مدت کوتاهی به فعالیت ادامه می‌دهد.", "در برابر اتفاق‌های کوچک به‌سرعت و به‌شدت ناراحت، دلخور یا گریان می‌شود؛ به‌گونه‌ای که واکنش او بیشتر از آن چیزی است که معمولاً از آن موقعیت انتظار می‌رود."] },
    { id: "s_em_2", text: "وقتی خواسته کودک پذیرفته نمی‌شود، در بازی انتخاب نمی‌شود، وسیله‌ای از او گرفته می‌شود یا با همسال یا مربی اختلاف پیدا می‌کند، معمولاً چه می‌کند؟", options: ["ناراحتی خود را بیان می‌کند، از مربی کمک می‌خواهد یا پس از مدت کوتاهی دوباره وارد ارتباط و فعالیت می‌شود.", "از دیگران فاصله می‌گیرد، پاسخ نمی‌دهد، صحبت یا بازی را قطع می‌کند و برای مدتی حاضر نیست دوباره وارد ارتباط یا فعالیت شود."] }
  ],
  "رفتار": [
    { id: "s_bh_1", text: "وقتی کودک عصبانی، ناراحت یا ناکام می‌شود، یا فعالیتی مطابق خواسته او پیش نمی‌رود، معمولاً با وسایل اطراف چه می‌کند؟", options: ["وسیله را کنار می‌گذارد، ناراحتی خود را بیان می‌کند یا با کمک مربی به فعالیت دیگری برمی‌گردد.", "وسایل را پرت می‌کند، پاره می‌کند، می‌شکند یا به‌گونه‌ای به آن‌ها آسیب می‌زند که استفاده از آن‌ها دشوار یا غیرممکن می‌شود."] },
    { id: "s_bh_2", text: "هنگام نقاشی، بازی، انتظار یا فعالیت‌های آرام، وقتی مداد، پاک‌کن، اسباب‌بازی یا وسایل دیگر در دسترس کودک است، معمولاً چه می‌کند؟", options: ["از وسیله برای همان فعالیت استفاده می‌کند و به‌ندرت آن را به دهان می‌برد.", "وسایل غیرخوراکی را در موقعیت‌های مختلف مکرراً در دهان می‌گذارد، می‌مکد یا می‌جود و پس از یادآوری نیز دوباره این کار را تکرار می‌کند."] }
  ],
  "تمرکز و توجه": [
    { id: "s_at_1", text: "وقتی مربی در جمع یا به‌صورت مستقیم یک دستور کوتاه و آشنا، مانند جمع‌کردن وسایل، نشستن روی فرش یا رفتن به صف را بیان می‌کند، کودک معمولاً چه می‌کند؟", options: ["دستور را می‌شنود و همراه دیگر کودکان یا با یک یادآوری کوتاه شروع به انجام آن می‌کند.", "معمولاً فعالیت قبلی را ادامه می‌دهد، به اطراف نگاه می‌کند یا منتظر می‌ماند تا مربی همان دستور را دوباره و به‌طور مستقیم برای خودش تکرار کند."] },
    { id: "s_at_2", text: "وقتی مربی یک دستور کوتاه دومرحله‌ای می‌دهد (مانند مداد را بگذار و نقاشی را روی میز بگذار)، کودک معمولاً چه می‌کند؟", options: ["هر دو مرحله را به‌ترتیب و بدون یادآوری دوباره انجام می‌دهد.", "یک مرحله را انجام می‌دهد، اما مرحله بعد را فراموش می‌کند، سراغ کار دیگری می‌رود یا می‌پرسد چه باید بکند."] }
  ],
  "تعامل با دیگران": [
    { id: "s_pr_1", text: "وقتی دوست موردعلاقه کودک غایب است، با کودک دیگری بازی می‌کند یا در گروه دیگری قرار می‌گیرد، کودک معمولاً چه می‌کند؟", options: ["ممکن است ابتدا ناراحت شود، اما با کودکان دیگر بازی می‌کند یا با حمایت کوتاه مربی فعالیت دیگری را انتخاب می‌کند.", "از بازی و فعالیت خودداری می‌کند، مرتب سراغ همان دوست را می‌گیرد یا فقط در صورتی وارد بازی می‌شود که آن کودک کنار او باشد."] },
    { id: "s_pr_2", text: "وقتی همسالی وسیله کودک را بدون اجازه می‌گیرد، او را از بازی کنار می‌گذارد، جایش را می‌گیرد یا به او فشار می‌آورد، کودک معمولاً چه می‌کند؟", options: ["با کلام یا حرکت مناسب اعتراض می‌کند، حق خود را درخواست می‌کند یا از مربی کمک می‌خواهد.", "بدون اعتراض کنار می‌رود، وسیله یا جای خود را واگذار می‌کند، ناراحت می‌شود اما چیزی نمی‌گوید یا بارها رفتار دیگران را تحمل می‌کند."] }
  ]
};

export function TeacherForm({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
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
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    const formAnswers: AssessmentAnswer[] = Object.entries(answers).map(([qId, val]) => ({
      questionId: Number(qId),
      answerValue: val
    }));

    const formattedProblemAreas = Object.entries(problemAreas).map(([domain, severity]) => ({ domain, severity: severity as "کمی" | "قطعا" | "خیلی" }));

    const formattedScenarios = Object.entries(scenarioAnswers).map(([sId, opt]) => {
      let domain = "";
      if (sId.startsWith("s_em")) domain = "احساسات";
      if (sId.startsWith("s_bh")) domain = "رفتار";
      if (sId.startsWith("s_at")) domain = "تمرکز و توجه";
      if (sId.startsWith("s_pr")) domain = "تعامل با دیگران";
      return { domain, scenarioId: sId, selectedOption: opt as string };
    });

    const form: TeacherAssessment = {
      id: uuidv4(),
      childId: id!,
      teacherId: user.id,
      centerId: user.centerIds[0] || "",
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/forms/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Failed");
      navigate(`/child/${id}`);
    } catch (err) {
      setError("خطا در ثبت فرم");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <Link to={`/child/${id}`} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">فرم دیدگاه مربی (TPCS)</h2>
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
            
            {Object.keys(problemAreas).map(domain => {
              const scenarios = SCENARIOS[domain];
              if (!scenarios) return null;
              
              return (
                <div key={domain} className="space-y-4">
                  <h4 className="font-bold text-lg text-gray-800 bg-gray-100 p-2 rounded">حوزه: {domain}</h4>
                  {scenarios.map(sc => (
                    <div key={sc.id} className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                      <p className="font-medium text-gray-900 text-sm">{sc.text}</p>
                      <div className="space-y-2">
                        {sc.options.map((opt, i) => (
                          <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${scenarioAnswers[sc.id] === opt ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`}>
                            <input type="radio" className="mt-1" checked={scenarioAnswers[sc.id] === opt} onChange={() => setScenarioAnswers({...scenarioAnswers, [sc.id]: opt})} />
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

        <div className="flex justify-end pt-6">
          <button type="submit" className="flex items-center gap-2 py-3 px-8 rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            <CheckCircle2 className="w-5 h-5" />
            ثبت نهایی فرم
          </button>
        </div>
      </form>
    </div>
  );
}
