import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { User, ParentAssessment, AssessmentAnswer } from "../types";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { fetchData, submitParentForm } from "../api";
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
  "اغلب داوطلب می‌شود به دیگران کمک کند (مانند والدین، مربیان یا بچه‌های دیگر).",
  "پیش از انجام کارها، معمولاً به آن فکر می‌کند.",
  "گاهی با رفتارهای خود باعث آزار دیگران می‌شود یا وسایل دیگران را بدون اجازه برمی‌دارد.",
  "با بزرگ‌ترها بهتر کنار می‌آید تا با هم‌سن‌وسالان خود.",
  "ترس‌های فراوانی دارد و خیلی زود وحشت می‌کند.",
  "کارهایش را تا پایان انجام می‌دهد و دقت و توجه خوبی دارد."
];

const IMPORTANT_CHANGES_OPTIONS = [
  "سوگ یا فوت فرد نزدیک",
  "جدایی یا طلاق والدین",
  "تعارض شدید والدین",
  "دوری از یکی از والدین",
  "ازدواج مجدد یکی از والدین",
  "تولد خواهر یا برادر",
  "بیماری کودک",
  "بیماری یا بستری‌شدن یکی از اعضای خانواده",
  "تغییر مراقب اصلی",
  "تغییر محل زندگی",
  "مهاجرت",
  "حادثه یا تجربه ترسناک",
  "تغییر قابل توجه در شرایط خانواده",
  "سایر",
  "هیچ‌کدام"
];

const SERVICES_OPTIONS = [
  "روان‌شناسی یا مشاوره",
  "بازی‌درمانی",
  "رفتاردرمانی",
  "کاردرمانی",
  "گفتاردرمانی",
  "آموزش یا توان‌بخشی ویژه",
  "ارزیابی روان‌پزشکی",
  "دارودرمانی",
  "خدمات پزشکی مرتبط",
  "سایر خدمات",
  "هیچ‌کدام"
];

export function ParentForm({ user, childIdParam, verificationNationalId, onSuccess }: { user: User, childIdParam?: string, verificationNationalId?: string, onSuccess?: () => void }) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = childIdParam || paramId;
  const navigate = useNavigate();
  
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childGender, setChildGender] = useState("");
  const [centerName, setCenterName] = useState("");
  const [centerRegion, setCenterRegion] = useState("");

  const [answers, setAnswers] = useState<Record<number, number>>({});
  
  const [relationToChild, setRelationToChild] = useState<ParentAssessment["relationToChild"]>("مادر");
  const [respondentName, setRespondentName] = useState(user.role === "والد" ? "" : user.fullName);
  const [respondentPhone, setRespondentPhone] = useState(user.role === "والد" ? "" : user.phone);
  
  const [overallProblem, setOverallProblem] = useState<ParentAssessment["overallProblem"]>("خیر");
  const [problemAreas, setProblemAreas] = useState<Record<string, "کمی" | "قطعا" | "خیلی">>({});
  
  const [durationOfProblem, setDurationOfProblem] = useState<ParentAssessment["durationOfProblem"]>("کمتر از یک ماه");
  const [childDistressLevel, setChildDistressLevel] = useState<ParentAssessment["childDistressLevel"]>("خیر");
  
  const [impactOnFamilyLife, setImpactOnFamilyLife] = useState<ParentAssessment["impactOnFamilyLife"]>("خیر");
  const [impactOnFriendships, setImpactOnFriendships] = useState<ParentAssessment["impactOnFriendships"]>("خیر");
  const [impactOnLearning, setImpactOnLearning] = useState<ParentAssessment["impactOnLearning"]>("خیر");
  const [impactOnLeisure, setImpactOnLeisure] = useState<ParentAssessment["impactOnLeisure"]>("خیر");
  const [burdenOnFamily, setBurdenOnFamily] = useState<ParentAssessment["burdenOnFamily"]>("خیر");

  const [importantChanges, setImportantChanges] = useState<string[]>([]);
  const [servicesUsed, setServicesUsed] = useState<string[]>([]);
  
  const [freeTextNotes, setFreeTextNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData().then(data => {
      const c = data.children.find(ch => ch.id === id);
      if (c) {
        setChildName(`${c.firstName} ${c.lastName}`);
        setChildGender(c.gender);
        const center = data.centers.find(item => item.id === c.currentCenterId);
        setCenterName(center?.name || "");
        setCenterRegion(center?.region || "");
        const age = calculateExactAge(c.birthDate);
        setChildAge(age ? age.formatted : "نامشخص");
      }
    });
  }, [id]);

  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, array: string[], item: string) => {
    if (item === "هیچ‌کدام") {
      setter(["هیچ‌کدام"]);
      return;
    }
    let newArray = array.filter(i => i !== "هیچ‌کدام");
    if (newArray.includes(item)) {
      newArray = newArray.filter(i => i !== item);
    } else {
      newArray.push(item);
    }
    setter(newArray);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(answers).length < 25) {
      setError(`لطفاً به همه ۲۵ سوال اصلی پاسخ دهید.`);
      window.scrollTo(0, 0);
      return;
    }

    const formAnswers: AssessmentAnswer[] = Object.entries(answers).map(([qId, val]) => ({
      questionId: Number(qId),
      answerValue: val
    }));

    const formattedProblemAreas = Object.entries(problemAreas).map(([domain, severity]) => ({ domain, severity: severity as "کمی" | "قطعا" | "خیلی" }));

    const form: ParentAssessment = {
      id: uuidv4(),
      childId: id!,
      parentId: user.id,
      respondentName,
      respondentPhone,
      centerId: user.centerIds[0] || "",
      formType: "PPCS",
      formVersion: "1.0.0",
      status: "SUBMITTED",
      childAgeAtAssessment: childAge,
      relationToChild,
      answers: formAnswers,
      overallProblem,
      problemAreas: formattedProblemAreas,
      durationOfProblem,
      childDistressLevel,
      impactOnFamilyLife,
      impactOnFriendships,
      impactOnLearning,
      impactOnLeisure,
      burdenOnFamily,
      importantChanges,
      servicesUsed,
      freeTextNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/forms/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, verificationNationalId })
      });
      if (!res.ok) throw new Error("Failed");
      
      if (onSuccess) {
        onSuccess();
      } else {
        alert("ارزیابی والد با موفقیت ثبت شد");
        navigate(`/child/${id}`);
      }
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
          <h2 className="text-2xl font-bold text-gray-900">فرم دیدگاه والد (PPCS)</h2>
          <p className="text-sm text-gray-500 mt-1">کودک: {childName} — پاسخ‌ها را با توجه به رفتار فرزندتان در شش ماه گذشته ثبت کنید.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        
        <div className="bg-white border rounded-xl p-6 shadow-sm">
           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
             <label className="block text-sm font-bold text-gray-900">نام و نام خانوادگی پاسخ‌دهنده
               <input required value={respondentName} onChange={e => setRespondentName(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 p-2.5" />
             </label>
             <label className="block text-sm font-bold text-gray-900">شماره تماس پاسخ‌دهنده (اختیاری)
               <input dir="ltr" type="tel" value={respondentPhone} onChange={e => setRespondentPhone(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 p-2.5" />
             </label>
           </div>
           <label className="mt-5 block text-sm font-bold text-gray-900">نسبت با کودک</label>
           <select value={relationToChild} onChange={e => setRelationToChild(e.target.value as any)} className="mt-2 w-full rounded-lg border border-gray-300 p-2.5 md:w-1/3">
             <option value="مادر">مادر</option><option value="پدر">پدر</option><option value="سرپرست قانونی">سرپرست قانونی</option><option value="سایر">سایر</option>
           </select>
           {/* Child identity and age are loaded from the linked child profile. */}
           <p className="mt-4 text-sm text-gray-500">مشخصات کودک: {childName} — جنسیت: {childGender || "نامشخص"} — سن هنگام تکمیل: {childAge} — مرکز: {centerName || "ثبت نشده"}{centerRegion ? ` (${centerRegion})` : ""}</p>
           <p className="mt-1 text-xs text-gray-500">تاریخ تکمیل فرم: {new Date().toLocaleDateString("fa-IR")}</p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-teal-900 border-b border-teal-100 pb-2">۱. بخش سوالات اصلی</h3>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {QUESTIONS.map((q, idx) => {
              const qId = idx + 1;
              const val = answers[qId];
              return (
                <div key={qId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
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
                      <label key={opt.v} className={`flex-1 flex justify-center items-center px-3 py-2 border rounded-lg text-xs font-medium cursor-pointer ${val === opt.v ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
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
          <h3 className="text-xl font-bold text-teal-900 border-b border-teal-100 pb-2">۲. بخش تکمیلی و تأثیر مشکلات (سوال ۲۶ به بعد)</h3>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <label className="block font-medium text-gray-900 mb-2">۲۶. به طور کلی، آیا فکر می‌کنید فرزندتان در زمینه‌های احساسات، تمرکز، رفتار یا تعامل مشکل دارد؟</label>
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
                      <option value="کمتر از یک ماه">کمتر از یک ماه</option><option value="۱ تا ۵ ماه">۱ تا ۵ ماه</option><option value="۶ تا ۱۲ ماه">۶ تا ۱۲ ماه</option><option value="بیش از یک سال">بیش از یک سال</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">۲۸. ناراحتی یا پریشانی فرزندتان:</label>
                    <select value={childDistressLevel} onChange={e => setChildDistressLevel(e.target.value as any)} className="w-full rounded-lg p-2.5 border">
                      <option value="خیر">خیر</option><option value="کمی">کمی</option><option value="زیاد">زیاد</option><option value="خیلی زیاد">خیلی زیاد</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-900">۲۹ و ۳۰. تأثیر مشکل بر عملکردهای روزمره (خانواده و کودک):</label>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[{ l: "زندگی خانوادگی", v: impactOnFamilyLife, fn: setImpactOnFamilyLife },
                      { l: "دوستی‌ها و ارتباط با همسالان", v: impactOnFriendships, fn: setImpactOnFriendships },
                      { l: "یادگیری", v: impactOnLearning, fn: setImpactOnLearning },
                      { l: "فعالیت‌های تفریحی", v: impactOnLeisure, fn: setImpactOnLeisure },
                      { l: "تحمل شرایط برای شما یا اعضای خانواده", v: burdenOnFamily, fn: setBurdenOnFamily }].map(it => (
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

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-teal-900 border-b border-teal-100 pb-2">۳. عوامل زمینه‌ای و خدمات درمانی</h3>
          <div className="bg-white border rounded-xl p-6 space-y-8">
            <div className="space-y-3">
              <label className="block font-medium text-gray-900">آیا در ماه‌های اخیر، تغییر یا رویداد مهمی در شرایط کودک رخ داده است که از آن اطلاع دارید؟ (امکان انتخاب چند مورد)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {IMPORTANT_CHANGES_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={importantChanges.includes(opt)} onChange={() => toggleArrayItem(setImportantChanges, importantChanges, opt)} className="rounded text-teal-600 focus:ring-teal-500" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block font-medium text-gray-900">آیا کودک، در حال حاضر یا در گذشته از خدمات زیر استفاده کرده است؟</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {SERVICES_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={servicesUsed.includes(opt)} onChange={() => toggleArrayItem(setServicesUsed, servicesUsed, opt)} className="rounded text-teal-600 focus:ring-teal-500" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block font-medium text-gray-900">اگر نکته یا نگرانی دیگری دارید، بنویسید (اختیاری):</label>
              <textarea 
                rows={3} 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500"
                maxLength={250}
                value={freeTextNotes}
                onChange={e => setFreeTextNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" className="flex items-center gap-2 py-3 px-8 rounded-xl shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">
            <CheckCircle2 className="w-5 h-5" />
            ثبت نهایی فرم
          </button>
        </div>
      </form>
    </div>
  );
}
