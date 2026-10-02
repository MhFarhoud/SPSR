import type { AlignmentResult, AssessmentScore, CaseStatus, Child } from "../../types";

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
  assessments: ScoredAssessment[] = []
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
  const latestEvaluationAt = Math.max(latestAssessmentAt, latestAlignmentAt);

  // A manual case decision made after the latest evaluation remains authoritative.
  if (child.statusChangeDate && timestamp(child.statusChangeDate) >= latestEvaluationAt) {
    return child.caseStatus;
  }

  // Prefer the joint parent/teacher decision when it reflects the latest submitted forms.
  if (latest && latestAlignmentAt >= latestAssessmentAt) {
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

  // A single completed form must affect the case list even while the other form is pending.
  if (latestAssessmentsByType.length > 0) {
    const levels = latestAssessmentsByType.map(assessment => assessment.score!.totalLevel);
    if (levels.includes("نابهنجار")) return "بررسی_تخصصی";
    if (levels.includes("مرزی")) return "نیازمند_بررسی";
    if (levels.every(level => level === "بهنجار")) return "عادی";
  }

  return child.caseStatus;
}

export function withEffectiveCaseStatus<T extends Child>(
  child: T,
  alignments: AlignmentResult[] = [],
  assessments: ScoredAssessment[] = []
): T {
  return { ...child, caseStatus: getEffectiveCaseStatus(child, alignments, assessments) };
}
