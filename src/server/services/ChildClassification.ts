import type { AlignmentResult, CaseStatus, Child } from "../../types";

export function getEffectiveCaseStatus(child: Child, alignments: AlignmentResult[] = []): CaseStatus | undefined {
  const latest = alignments
    .filter(alignment => alignment.childId === child.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // A manual status change made after the latest assessment remains authoritative.
  if (!latest || (child.statusChangeDate && new Date(child.statusChangeDate) >= new Date(latest.createdAt))) {
    return child.caseStatus;
  }

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

export function withEffectiveCaseStatus<T extends Child>(child: T, alignments: AlignmentResult[] = []): T {
  return { ...child, caseStatus: getEffectiveCaseStatus(child, alignments) };
}
