import { AssessmentAnswer, AssessmentScore, AssessmentSubscaleScore, ImpactScore } from "../types";

const REVERSE_ITEMS = [7, 11, 14, 21, 25];

function scoreItem(questionId: number, answerValue: number): number {
  if (answerValue === 0) return REVERSE_ITEMS.includes(questionId) ? 2 : 0;
  if (answerValue === 1) return 1;
  if (answerValue === 2) return REVERSE_ITEMS.includes(questionId) ? 0 : 2;
  return 0; // Default or unhandled
}

export function calculateTPCS(answers: AssessmentAnswer[]): AssessmentScore {
  const getScore = (qId: number) => {
    const ans = answers.find(a => a.questionId === qId || a.questionId === String(qId));
    if (!ans || typeof ans.answerValue !== "number") return 0;
    return scoreItem(qId, ans.answerValue);
  };

  const scoreA = getScore(3) + getScore(8) + getScore(13) + getScore(16) + getScore(24);
  const scoreB = getScore(5) + getScore(7) + getScore(12) + getScore(18) + getScore(22);
  const scoreC = getScore(2) + getScore(10) + getScore(15) + getScore(21) + getScore(25);
  const scoreD = getScore(6) + getScore(11) + getScore(14) + getScore(19) + getScore(23);
  const scoreE = getScore(1) + getScore(4) + getScore(9) + getScore(17) + getScore(20);

  const total = scoreA + scoreB + scoreC + scoreD;

  const levelTotal = total <= 11 ? "بهنجار" : total <= 15 ? "مرزی" : "نابهنجار";
  const levelA = scoreA <= 4 ? "بهنجار" : scoreA === 5 ? "مرزی" : "نابهنجار";
  const levelB = scoreB <= 2 ? "بهنجار" : scoreB === 3 ? "مرزی" : "نابهنجار";
  const levelC = scoreC <= 5 ? "بهنجار" : scoreC === 6 ? "مرزی" : "نابهنجار";
  const levelD = scoreD <= 3 ? "بهنجار" : scoreD === 4 ? "مرزی" : "نابهنجار";
  const levelE = scoreE >= 6 ? "بهنجار" : scoreE === 5 ? "مرزی" : "نابهنجار"; // Prosocial

  return {
    totalDifficultiesScore: total,
    totalLevel: levelTotal,
    subscales: [
      { domain: "A", score: scoreA, level: levelA },
      { domain: "B", score: scoreB, level: levelB },
      { domain: "C", score: scoreC, level: levelC },
      { domain: "D", score: scoreD, level: levelD },
      { domain: "E", score: scoreE, level: levelE }
    ]
  };
}

export function calculatePPCS(answers: AssessmentAnswer[]): AssessmentScore {
  const getScore = (qId: number) => {
    const ans = answers.find(a => a.questionId === qId || a.questionId === String(qId));
    if (!ans || typeof ans.answerValue !== "number") return 0;
    return scoreItem(qId, ans.answerValue);
  };

  const scoreA = getScore(3) + getScore(8) + getScore(13) + getScore(16) + getScore(24);
  const scoreB = getScore(5) + getScore(7) + getScore(12) + getScore(18) + getScore(22);
  const scoreC = getScore(2) + getScore(10) + getScore(15) + getScore(21) + getScore(25);
  const scoreD = getScore(6) + getScore(11) + getScore(14) + getScore(19) + getScore(23);
  const scoreE = getScore(1) + getScore(4) + getScore(9) + getScore(17) + getScore(20);

  const total = scoreA + scoreB + scoreC + scoreD;

  const levelTotal = total <= 13 ? "بهنجار" : total <= 16 ? "مرزی" : "نابهنجار";
  const levelA = scoreA <= 3 ? "بهنجار" : scoreA === 4 ? "مرزی" : "نابهنجار";
  const levelB = scoreB <= 2 ? "بهنجار" : scoreB === 3 ? "مرزی" : "نابهنجار";
  const levelC = scoreC <= 5 ? "بهنجار" : scoreC === 6 ? "مرزی" : "نابهنجار";
  const levelD = scoreD <= 2 ? "بهنجار" : scoreD === 3 ? "مرزی" : "نابهنجار";
  const levelE = scoreE >= 6 ? "بهنجار" : scoreE === 5 ? "مرزی" : "نابهنجار";

  return {
    totalDifficultiesScore: total,
    totalLevel: levelTotal,
    subscales: [
      { domain: "A", score: scoreA, level: levelA },
      { domain: "B", score: scoreB, level: levelB },
      { domain: "C", score: scoreC, level: levelC },
      { domain: "D", score: scoreD, level: levelD },
      { domain: "E", score: scoreE, level: levelE }
    ]
  };
}

export function calculateImpactScore(
  overallProblem: "خیر" | "بله، کمی مشکل دارد." | "بله، قطعاً مشکل دارد." | "بله، خیلی مشکل دارد.",
  impactAnswers: {
    q28: "خیر" | "کمی" | "زیاد" | "خیلی زیاد",
    q29a: "خیر" | "کمی" | "زیاد" | "خیلی زیاد",
    q29b: "خیر" | "کمی" | "زیاد" | "خیلی زیاد",
    q29c: "خیر" | "کمی" | "زیاد" | "خیلی زیاد",
    q29d: "خیر" | "کمی" | "زیاد" | "خیلی زیاد",
    q30: "خیر" | "کمی" | "زیاد" | "خیلی زیاد"
  }
): ImpactScore {
  if (overallProblem === "خیر") {
    return { impactScore: 0, level: "پایین" };
  }

  const scoreMap = {
    "خیر": 0,
    "کمی": 0,
    "زیاد": 1,
    "خیلی زیاد": 2
  };

  const totalImpact = 
    scoreMap[impactAnswers.q28] +
    scoreMap[impactAnswers.q29a] +
    scoreMap[impactAnswers.q29b] +
    scoreMap[impactAnswers.q29c] +
    scoreMap[impactAnswers.q29d] +
    scoreMap[impactAnswers.q30];

  return {
    impactScore: totalImpact,
    level: totalImpact >= 8 ? "بالا" : "پایین"
  };
}
