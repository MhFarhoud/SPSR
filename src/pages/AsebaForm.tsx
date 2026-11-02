import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { fetchData } from "../api";
import { ASEBA_QUESTIONS, ASEBA_SOMATIC_ITEMS, ASEBA_SOMATIC_LABELS } from "../domain/aseba";
import type { AsebaAnswer, AsebaFormType, AppData, User } from "../types";

const NOTE_ITEMS = new Set([9,29,40,46,56,58,66,70,73,77,79,83,84,85,92,100,105,113]);
const OPTIONS = [{ value: 0, label: "صحیح نیست" }, { value: 1, label: "تا حدی یا گاهی صحیح است" }, { value: 2, label: "اغلب یا کاملاً صحیح است" }] as const;

export function AsebaForm({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedType = params.get("type") === "CBCL" ? "CBCL" : "TRF";
  const formType: AsebaFormType = user.role === "مربی" ? "TRF" : requestedType;
  const editId = params.get("edit");
  const [data, setData] = useState<AppData | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [adaptiveScores, setAdaptiveScores] = useState<number[]>([4,4,4,4]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData().then(result => {
      setData(result);
      const existing = editId ? result.asebaAssessments.find(item => item.id === editId && item.childId === id && item.formType === formType) : undefined;
      if (existing) {
        setAnswers(Object.fromEntries(existing.answers.map(answer => [String(answer.questionId), Number(answer.answerValue)])));
        setNotes(Object.fromEntries(existing.answers.filter(answer => answer.note).map(answer => [String(answer.questionId), answer.note || ""])));
        setAdaptiveScores(existing.adaptiveScores || [4,4,4,4]);
      }
    });
  }, [id, editId, formType]);

  const child = data?.children.find(item => item.id === id);
  const questions = useMemo(() => ASEBA_QUESTIONS[formType], [formType]);
  const answeredCount = Array.from({ length: 113 }, (_, index) => String(index + 1)).filter(key => answers[key] !== undefined).length;
  const answeredSomaticCount = ASEBA_SOMATIC_ITEMS.filter(key => answers[key] !== undefined).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!child || answeredCount !== 113 || answeredSomaticCount !== ASEBA_SOMATIC_ITEMS.length) {
      return setError(`پاسخ همه ۱۱۳ گویه و ۸ زیرگویه جسمانی الزامی است؛ اکنون ${answeredCount} گویه و ${answeredSomaticCount} زیرگویه پاسخ دارد.`);
    }
    setSaving(true); setError("");
    const mainAnswers: AsebaAnswer[] = Array.from({ length: 113 }, (_, index) => ({ questionId: index + 1, answerValue: answers[String(index + 1)] as 0|1|2, note: notes[String(index + 1)]?.trim() || undefined }));
    const somaticAnswers: AsebaAnswer[] = ASEBA_SOMATIC_ITEMS.map(key => ({ questionId: key, answerValue: answers[key] as 0|1|2 }));
    try {
      const response = await fetch("/api/assessments/aseba", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId || undefined, childId: child.id, formType, answers: [...mainAnswers, ...somaticAnswers], adaptiveScores: formType === "TRF" ? adaptiveScores : undefined }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "ثبت فرم انجام نشد.");
      navigate(`/child/${child.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت فرم انجام نشد."); }
    finally { setSaving(false); }
  };

  if (!data || !child) return <div className="p-8 text-center text-gray-500">در حال بارگذاری فرم...</div>;

  return <div className="mx-auto max-w-5xl space-y-6 pb-20" dir="rtl">
    <header className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">فرم جامع {formType === "CBCL" ? "دیدگاه والد CBCL" : "دیدگاه مربی TRF"}</h2>
      <p className="mt-2 text-sm text-gray-600">کودک: {child.firstName} {child.lastName} · {child.childId || child.id}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-indigo-600" style={{ width: `${Math.round(answeredCount / 113 * 100)}%` }} /></div>
      <p className="mt-2 text-xs text-gray-500">{answeredCount} از ۱۱۳ گویه و {answeredSomaticCount} از ۸ زیرگویه جسمانی پاسخ داده شده است.</p>
    </header>
    <form onSubmit={submit} className="space-y-5">
      {questions.map((question, index) => {
        const questionId = index + 1;
        return <section key={questionId} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-gray-900"><span className="ml-2 text-indigo-700">{questionId}.</span>{question}</p>
          <div className="mt-4 flex flex-wrap gap-2">{OPTIONS.map(option => <label key={option.value} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${answers[String(questionId)] === option.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 bg-white text-gray-700"}`}><input className="sr-only" type="radio" name={`q-${questionId}`} checked={answers[String(questionId)] === option.value} onChange={() => setAnswers(current => ({ ...current, [String(questionId)]: option.value }))} />{option.label}</label>)}</div>
          {questionId === 56 && <div className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">{ASEBA_SOMATIC_ITEMS.map((key, itemIndex) => <div key={key}><p className="mb-2 text-xs font-medium text-gray-700">{ASEBA_SOMATIC_LABELS[itemIndex]}</p><div className="flex gap-1">{OPTIONS.map(option => <label key={option.value} className={`cursor-pointer rounded border px-2 py-1 text-xs ${answers[key] === option.value ? "border-indigo-600 bg-indigo-600 text-white" : "bg-white"}`}><input className="sr-only" type="radio" name={key} checked={answers[key] === option.value} onChange={() => setAnswers(current => ({ ...current, [key]: option.value }))} />{option.value}</label>)}</div></div>)}</div>}
          {NOTE_ITEMS.has(questionId) && answers[String(questionId)] > 0 && <textarea value={notes[String(questionId)] || ""} onChange={event => setNotes(current => ({ ...current, [String(questionId)]: event.target.value }))} maxLength={150} rows={2} placeholder="توضیح تکمیلی این گویه" className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm" />}
        </section>;
      })}
      {formType === "TRF" && <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5"><h3 className="font-bold text-indigo-950">عملکرد انطباقی مربی</h3><div className="mt-4 grid gap-4 md:grid-cols-2">{["تلاش و مشارکت در فعالیت‌ها", "رفتار متناسب با موقعیت و قوانین گروه", "یادگیری و کسب مهارت‌های جدید", "شاد و سرحال بودن در مرکز"].map((label,index) => <label key={label} className="text-sm text-gray-800">{label}<select value={adaptiveScores[index]} onChange={event => setAdaptiveScores(current => current.map((value,i) => i === index ? Number(event.target.value) : value))} className="mt-1 w-full rounded-lg border bg-white p-2">{[1,2,3,4,5,6,7].map(value => <option key={value}>{value}</option>)}</select></label>)}</div></section>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="sticky bottom-4 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg disabled:opacity-50"><CheckCircle2 className="h-5 w-5" />{saving ? "در حال ثبت..." : "ثبت نهایی فرم"}</button></div>
    </form>
  </div>;
}
