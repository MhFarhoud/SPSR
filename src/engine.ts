export const SCORE_LABELS = {
  NORMAL: "بهنجار",
  BORDERLINE: "مرزی",
  ABNORMAL: "نابهنجار"
};

export function computeTeacherForm(items: Record<string, number>, summary: any) {
  const get = (qId: number) => items[`q${qId}`] || 0;
  const rev = (qId: number) => 2 - get(qId);

  // A) نشانههای هیجانی = q3 + q8 + q13 + q16 + q24
  const domainA = get(3) + get(8) + get(13) + get(16) + get(24);
  
  // B) مشکلات سلوک = q5 + (2-q7) + q12 + q18 + q22
  const domainB = get(5) + rev(7) + get(12) + get(18) + get(22);

  // C) بیشفعالی-کمبود توجه = q2 + q10 + q15 + (2-q21) + (2-q25)
  const domainC = get(2) + get(10) + get(15) + rev(21) + rev(25);

  // D) مشکلات با همتایان = q6 + (2-q11) + (2-q14) + q19 + q23
  const domainD = get(6) + rev(11) + rev(14) + get(19) + get(23);

  // E) رفتارهای جامعهپسند (پروسوشال) = q1 + q4 + q9 + q17 + q20
  const domainE = get(1) + get(4) + get(9) + get(17) + get(20);

  const totalScore = domainA + domainB + domainC + domainD;

  const getLabel = (score: number, normalMax: number, borderline: number) => {
    if (score <= normalMax) return SCORE_LABELS.NORMAL;
    if (score === borderline) return SCORE_LABELS.BORDERLINE;
    return SCORE_LABELS.ABNORMAL;
  };

  const getLabelE = (score: number) => {
    if (score >= 6) return SCORE_LABELS.NORMAL; // مطلوب
    if (score === 5) return SCORE_LABELS.BORDERLINE;
    return SCORE_LABELS.ABNORMAL; // نگران‌کننده
  };

  const domainLabels = {
    A: getLabel(domainA, 3, 4),
    B: getLabel(domainB, 2, 3),
    C: getLabel(domainC, 5, 6),
    D: getLabel(domainD, 2, 3),
    E: getLabelE(domainE)
  };

  const totalLevelLabel = getLabel(totalScore, 13, 16);

  // Rule engine for suggested level
  let suggestedChildLevel: 1 | 2 | 3 | 4 = 1;

  const abnormalDomains = Object.values(domainLabels).slice(0, 4).filter(l => l === SCORE_LABELS.ABNORMAL).length;
  const borderlineDomains = Object.values(domainLabels).slice(0, 4).filter(l => l === SCORE_LABELS.BORDERLINE).length;
  
  const hasHighDistress = ["زیاد", "خیلی زیاد"].includes(summary?.childDistressLevel);
  const hasHighImpact = ["زیاد", "خیلی زیاد"].includes(summary?.impactOnLearning) || ["زیاد", "خیلی زیاد"].includes(summary?.impactOnPeerRelations);
  const ruleCooccurence = hasHighDistress || hasHighImpact;

  if (totalLevelLabel === SCORE_LABELS.ABNORMAL && abnormalDomains >= 1 && ruleCooccurence) {
    suggestedChildLevel = 4;
  } else if ((abnormalDomains === 1) || (totalLevelLabel === SCORE_LABELS.ABNORMAL)) {
    suggestedChildLevel = 3;
  } else if (totalLevelLabel === SCORE_LABELS.BORDERLINE || abnormalDomains + borderlineDomains >= 2 || ruleCooccurence) {
    suggestedChildLevel = 2;
  } else {
    suggestedChildLevel = 1;
  }

  return {
    totalScore,
    domainA, domainB, domainC, domainD, domainE,
    totalLevelLabel,
    domainLabels,
    suggestedChildLevel
  };
}
