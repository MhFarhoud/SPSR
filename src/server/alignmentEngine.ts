import { AlignmentResult, ParentAssessment, TeacherAssessment } from "../types";
import { v4 as uuidv4 } from "uuid";

export function compareAssessments(
  parentAssessment: ParentAssessment,
  teacherAssessment: TeacherAssessment
): AlignmentResult {
  if (!parentAssessment.score || !teacherAssessment.score) {
    throw new Error("Both assessments must be scored before alignment.");
  }

  const pLevel = parentAssessment.score.totalLevel;
  const tLevel = teacherAssessment.score.totalLevel;

  let misalignmentSeverity: "خفیف" | "قابل‌توجه" = "خفیف";
  let suggestedPath: AlignmentResult["suggestedPath"] = "پایش عادی";

  if (pLevel === "بهنجار" && tLevel === "بهنجار") {
    suggestedPath = "پایش عادی";
    misalignmentSeverity = "خفیف";
  } else if (pLevel === "بهنجار" && tLevel === "مرزی") {
    suggestedPath = "بررسی حوزه مرزی و مشاهده هدفمند فضای کلاس";
    misalignmentSeverity = "خفیف";
  } else if (pLevel === "مرزی" && tLevel === "بهنجار") {
    suggestedPath = "بررسی شرایط خانه و گفت‌وگوی سرمربی با والد";
    misalignmentSeverity = "خفیف";
  } else if (pLevel === "مرزی" && tLevel === "مرزی") {
    suggestedPath = "ورود به رصد و فالوآپ";
    misalignmentSeverity = "خفیف";
  } else if (pLevel === "بهنجار" && tLevel === "نابهنجار") {
    suggestedPath = "بررسی فوری‌تر محیط مرکز و گزارش مربی";
    misalignmentSeverity = "قابل‌توجه";
  } else if (pLevel === "نابهنجار" && tLevel === "بهنجار") {
    suggestedPath = "بررسی شرایط خانه و مصاحبه تکمیلی با والد";
    misalignmentSeverity = "قابل‌توجه";
  } else if (pLevel === "مرزی" && tLevel === "نابهنجار") {
    suggestedPath = "بررسی تکمیلی و احتمال ورود به مسیر زرد یا قرمز";
    misalignmentSeverity = "قابل‌توجه";
  } else if (pLevel === "نابهنجار" && tLevel === "مرزی") {
    suggestedPath = "بررسی تکمیلی و احتمال ورود به مسیر زرد یا قرمز";
    misalignmentSeverity = "قابل‌توجه";
  } else if (pLevel === "نابهنجار" && tLevel === "نابهنجار") {
    suggestedPath = "بررسی تخصصی و تعیین شدت ارجاع";
    misalignmentSeverity = "خفیف"; // It's aligned but high severity overall. The PDF says "همخوانی در سطح ناهنجار"
  }

  const domainAlignments = parentAssessment.score.subscales.map(pSub => {
    const tSub = teacherAssessment.score!.subscales.find(t => t.domain === pSub.domain)!;
    return {
      domain: pSub.domain,
      parentLevel: pSub.level,
      teacherLevel: tSub.level,
      isAligned: pSub.level === tSub.level
    };
  });

  const alignedAreas = domainAlignments.filter(d => d.isAligned).map(d => d.domain);
  const misalignedAreas = domainAlignments.filter(d => !d.isAligned).map(d => d.domain);

  return {
    id: uuidv4(),
    childId: parentAssessment.childId,
    parentAssessmentId: parentAssessment.id,
    teacherAssessmentId: teacherAssessment.id,
    overallParentLevel: pLevel,
    overallTeacherLevel: tLevel,
    domainAlignments,
    alignedAreas,
    misalignedAreas,
    misalignmentSeverity,
    suggestedPath,
    createdAt: new Date().toISOString()
  };
}
