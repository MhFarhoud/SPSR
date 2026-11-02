import questions from "../data/asebaQuestions.json";
import type { AsebaAnswer, AsebaAssessment, AsebaFormType, AsebaScore } from "../types";

export const ASEBA_QUESTIONS: Record<AsebaFormType, string[]> = questions;

type ScaleDefinition = { label: string; items: Array<number | string>; max: number };

const CBCL_SCALES: Record<string, ScaleDefinition> = {
  anxietyDepression: { label: "اضطراب و افسردگی", items: [14,29,30,31,32,33,35,45,50,52,71,91,112], max: 26 },
  withdrawnDepression: { label: "گوشه‌گیری و افسردگی", items: [5,42,65,69,75,102,103,111], max: 16 },
  somaticComplaints: { label: "شکایات جسمانی", items: [47,49,51,54,"56a","56b","56c","56d","56e","56f","56g"], max: 22 },
  socialProblems: { label: "مشکلات اجتماعی", items: [11,12,25,27,34,36,38,48,62,64,79], max: 22 },
  thoughtProblems: { label: "مشکلات تفکر", items: [9,18,40,46,58,59,60,66,70,76,83,84,85,92,100], max: 30 },
  attentionProblems: { label: "مشکلات توجه", items: [1,4,8,10,13,17,41,61,78,80], max: 20 },
  ruleBreaking: { label: "رفتار قانون‌شکنی", items: [2,26,28,39,43,63,67,72,73,81,82,90,96,99,101,105,106], max: 34 },
  aggressiveBehavior: { label: "رفتار پرخاشگرانه", items: [3,16,19,20,21,22,23,27,37,57,68,86,87,88,89,94,95,97,104], max: 38 },
};

const TRF_SCALES: Record<string, ScaleDefinition> = {
  anxietyDepression: { label: "اضطراب و افسردگی", items: [14,29,30,31,32,33,35,45,50,52,71,81,91,106,108,112], max: 32 },
  withdrawnDepression: { label: "گوشه‌گیری و افسردگی", items: [5,42,65,69,75,102,103,111], max: 16 },
  somaticComplaints: { label: "شکایات جسمانی", items: [51,54,"56a","56b","56c","56d","56e","56f","56g"], max: 18 },
  socialProblems: { label: "مشکلات اجتماعی", items: [11,12,25,27,34,36,38,48,62,64,79], max: 22 },
  thoughtProblems: { label: "مشکلات تفکر", items: [9,18,40,46,58,66,70,83,84,85], max: 20 },
  attentionProblems: { label: "مشکلات توجه", items: [1,2,4,7,8,10,13,15,17,22,24,41,49,53,60,61,67,72,73,74,78,80,92,93,100,109], max: 52 },
  ruleBreaking: { label: "رفتار قانون‌شکنی", items: [26,28,39,43,63,82,90,96,98,99,101,105], max: 24 },
  aggressiveBehavior: { label: "رفتار پرخاشگرانه", items: [3,6,16,19,20,21,23,37,57,67,68,76,77,86,87,88,89,94,95,97,104], max: 42 },
};

const TRF_ATTENTION = {
  inattention: { label: "بی‌توجهی", items: [1,4,8,13,17,22,49,60,61,72,78,80,92,100], max: 28 },
  hyperactivityImpulsivity: { label: "بیش‌فعالی و تکانشگری", items: [2,7,10,15,24,41,53,67,73,74,93,109], max: 24 },
};

export const ASEBA_SOMATIC_ITEMS = ["56a", "56b", "56c", "56d", "56e", "56f", "56g", "56h"];
export const ASEBA_SOMATIC_LABELS = ["درد در نقاط مختلف بدن", "سردرد", "تهوع یا دل‌به‌هم‌خوردگی", "مشکلات چشمی", "جوش یا مشکلات پوستی", "دل‌درد یا دل‌پیچه", "استفراغ", "سایر مشکلات جسمانی"];

const RAPID_REVIEW: Record<AsebaFormType, number[]> = { CBCL: [2,18,67,72,91,99,105], TRF: [18,91,99,105] };
const SPECIALIST_REVIEW: Record<AsebaFormType, number[]> = {
  CBCL: [5,6,9,12,13,15,16,20,21,28,30,31,33,34,35,37,38,40,46,48,50,52,54,56,57,58,59,60,65,66,70,73,75,76,77,79,80,81,82,83,84,85,87,89,96,97,100,101,102,103,106,111,112],
  TRF: [2,5,6,9,11,12,13,14,16,20,21,23,24,25,28,30,31,33,34,35,37,38,40,46,48,49,50,52,54,56,57,58,59,60,61,65,66,67,68,70,73,75,76,77,79,80,82,83,84,85,87,89,92,94,95,96,97,101,102,103,106,107,108,110,111,112],
};

function answerMap(answers: AsebaAnswer[]): Map<string, number> {
  return new Map(answers.map(answer => [String(answer.questionId), Number(answer.answerValue) || 0]));
}

function sum(items: Array<number | string>, values: Map<string, number>): number {
  return items.reduce<number>((total, item) => total + (values.get(String(item)) || 0), 0);
}

function cbclLevel(score: number, gender: "پسر" | "دختر", index: "internalizing" | "externalizing" | "total"): "بهنجار" | "مرزی" | "نابهنجار" {
  const thresholds = gender === "دختر"
    ? { internalizing: [10,13], externalizing: [11,14], total: [37,48] }
    : { internalizing: [8,11], externalizing: [11,15], total: [38,48] };
  const [normalMax, borderlineMax] = thresholds[index];
  return score <= normalMax ? "بهنجار" : score <= borderlineMax ? "مرزی" : "نابهنجار";
}

export function calculateAseba(formType: AsebaFormType, answers: AsebaAnswer[], gender: "پسر" | "دختر", adaptiveScores?: number[]): AsebaScore {
  const values = answerMap(answers);
  const definitions = formType === "CBCL" ? CBCL_SCALES : TRF_SCALES;
  const subscales = Object.entries(definitions).map(([key, definition]) => ({ key, label: definition.label, score: sum(definition.items, values), max: definition.max }));
  const byKey = Object.fromEntries(subscales.map(scale => [scale.key, scale.score]));
  const internalizing = byKey.anxietyDepression + byKey.withdrawnDepression + byKey.somaticComplaints;
  // Items 27 (CBCL) and 67 (TRF) contribute to the syndrome display but the
  // attached scoring sheets exclude them from the broadband externalizing sum.
  const externalizingExcluded = formType === "CBCL" ? 27 : 67;
  const externalizingItems = [...new Set([...definitions.ruleBreaking.items, ...definitions.aggressiveBehavior.items])]
    .filter(item => item !== externalizingExcluded);
  const externalizing = sum(externalizingItems, values);
  const scoredMainItems = Array.from({ length: 113 }, (_, index) => index + 1).filter(id => id !== 56).map(String);
  const totalProblems = sum([...scoredMainItems, ...ASEBA_SOMATIC_ITEMS], values);
  const attentionSubscales = formType === "TRF" ? Object.entries(TRF_ATTENTION).map(([key, definition]) => ({ key, label: definition.label, score: sum(definition.items, values), max: definition.max })) : [];
  const rapidReviewFlags = RAPID_REVIEW[formType].filter(id => (values.get(String(id)) || 0) >= 1).map(id => ({ questionId: id, score: values.get(String(id)) || 0 }));
  const specialistFlags = SPECIALIST_REVIEW[formType].filter(id => (values.get(String(id)) || 0) >= 2).map(id => ({ questionId: id, score: values.get(String(id)) || 0 }));
  return {
    subscales,
    attentionSubscales,
    indices: [
      { key: "internalizing", label: "مشکلات درونی‌سازی‌شده", score: internalizing, max: formType === "CBCL" ? 64 : 66, level: formType === "CBCL" ? cbclLevel(internalizing, gender, "internalizing") : undefined },
      { key: "externalizing", label: "مشکلات برونی‌سازی‌شده", score: externalizing, max: formType === "CBCL" ? 70 : 64, level: formType === "CBCL" ? cbclLevel(externalizing, gender, "externalizing") : undefined },
      { key: "total", label: "مشکلات کلی", score: totalProblems, max: 240, level: formType === "CBCL" ? cbclLevel(totalProblems, gender, "total") : undefined },
    ],
    adaptiveScores: formType === "TRF" && adaptiveScores?.length === 4 ? { components: adaptiveScores, total: adaptiveScores.reduce((a,b) => a + b, 0) } : undefined,
    rapidReviewFlags,
    specialistFlags,
  };
}

export function isCompleteAseba(assessment: Pick<AsebaAssessment, "answers">): boolean {
  const ids = new Set(assessment.answers.map(answer => Number(answer.questionId)).filter(Number.isInteger));
  const somaticIds = new Set(assessment.answers.map(answer => String(answer.questionId)).filter(id => ASEBA_SOMATIC_ITEMS.includes(id)));
  return ids.size === 113
    && Array.from(ids).every(id => id >= 1 && id <= 113)
    && ASEBA_SOMATIC_ITEMS.every(id => somaticIds.has(id));
}
