import type { AlignmentResult, AssessmentScore, CaseStatus, Child, FollowUp } from "../../types";

export type ScoredAssessment = {
  id: string;
  childId: string;
  formType: "TPCS" | "PPCS";
  score?: AssessmentScore;
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
};

function timestamp(value?: string): number {
  return value ? new Date(value).getTime() || 0 : 0;
}

export function getEffectiveCaseStatus(
  child: Child,
  alignments: AlignmentResult[] = [],
  assessments: ScoredAssessment[] = [],
  followUps: FollowUp[] = []
): CaseStatus | undefined {
  const childAssessments = assessments.filter(assessment => assessment.childId === child.id && assessment.score);
  const latestAssessmentsByType = ["TPCS", "PPCS"].map(formType => childAssessments
    .filter(assessment => assessment.formType === formType)
    .sort((a, b) => timestamp(b.submittedAt || b.updatedAt || b.createdAt) - timestamp(a.submittedAt || a.updatedAt || a.createdAt))[0])
    .filter((assessment): assessment is ScoredAssessment => Boolean(assessment));
  const latestTeacherAssessment = latestAssessmentsByType.find(assessment => assessment.formType === "TPCS");
  const latestParentAssessment = latestAssessmentsByType.find(assessment => assessment.formType === "PPCS");
  const latest = latestTeacherAssessment && latestParentAssessment
    ? alignments
      .filter(alignment => alignment.childId === child.id && alignment.teacherAssessmentId === latestTeacherAssessment.id && alignment.parentAssessmentId === latestParentAssessment.id)
      .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))[0]
    : undefined;
  const latestAssessmentAt = Math.max(0, ...childAssessments.map(assessment => timestamp(assessment.submittedAt || assessment.updatedAt || assessment.createdAt)));
  const latestAlignmentAt = timestamp(latest?.createdAt);
  const latestFollowUp = followUps
    .filter(item => item.childId === child.id && ["SUBMITTED", "ثبت_نهایی_شده", "LOCKED"].includes(item.status))
    .sort((a, b) => timestamp(b.submittedAt || b.createdAt) - timestamp(a.submittedAt || a.createdAt))[0];
  const latestFollowUpAt = timestamp(latestFollowUp?.submittedAt || latestFollowUp?.createdAt);
  const latestEvaluationAt = Math.max(latestAssessmentAt, latestAlignmentAt, latestFollowUpAt);

  // A manual case decision made after the latest evaluation remains authoritative.
  if (child.statusChangeDate && timestamp(child.statusChangeDate) >= latestEvaluationAt) {
    return child.caseStatus;
  }

  // Prefer the joint parent/teacher decision when it reflects the latest submitted forms.
  if (latest && latestAlignmentAt >= latestAssessmentAt && latestAlignmentAt >= latestFollowUpAt) {
    const pathToStatus: Record<AlignmentResult["suggestedPath"], CaseStatus> = {
      "پایش عادی": "عادی",
      "بررسی حوزه مرزی و مشاهده هدفمند فضای کلاس": "نیازمند_بررسی",
      "بررسی شرایط خانه و گفت‌وگوی سرمربی با والد": "نیازمند_بررسی",
      "ورود به رصد و فالوآپ": "فالوآپ",
      "بررسی فوری‌تر محیط مرکز و گزارش مربی": "بررسی_تخصصی",
      "بررسی شرایط خانه و مصاحبه تکمیلی با والد": "بررسی_تخصصی",
      "بررسی تکمیلی و احتمال ورود به مسیر زرد یا قرمز": "بررسی_تخصصی",
      "بررسی تخصصی و تعیین شدت ارجاع": "بررسی_تخصصی"
    };
    return pathToStatus[latest.suggestedPath] || child.caseStatus;
  }

  if (latestFollowUp && latestFollowUpAt >= latestAssessmentAt) {
    switch (latestFollowUp.specialistDecision) {
      case "پایان فالوآپ و بازگشت به پایش معمول": return "عادی";
      case "بررسی سرمربی":
      case "گفت‌وگو با خانواده": return "نیازمند_بررسی";
      case "بررسی تیم تخصصی":
      case "نیاز به اقدام سریع": return "بررسی_تخصصی";
      default: return "فالوآپ";
    }
  }

  // A single completed form must affect the case list even while the other form is pending.
  if (latestAssessmentsByType.length > 0) {
    const levels = latestAssessmentsByType.map(assessment => assessment.score!.totalLevel);
    if (levels.includes("نابهنجار")) return "بررسی_تخصصی";
    if (levels.includes("مرزی")) return "نیازمند_بررسی";
    if (levels.every(level => level === "بهنجار")) return "عادی";
  }

  // A default "عادی" value is not an assessment result. Keep unassessed
  // children distinct until at least one scored form has been submitted.
  if (child.caseStatus && child.caseStatus !== "عادی") return child.caseStatus;
  return "در_حال_ارزیابی";
}

export function withEffectiveCaseStatus<T extends Child>(
  child: T,
  alignments: AlignmentResult[] = [],
  assessments: ScoredAssessment[] = [],
  followUps: FollowUp[] = []
): T {
  return { ...child, caseStatus: getEffectiveCaseStatus(child, alignments, assessments, followUps) };
}
