import React from "react";
import type { AssessmentScore } from "../types";
import { Badge } from "./ui/Badge";

export const ASSESSMENT_SCALE_NAMES: Record<string, string> = {
  A: "مشکلات عاطفی",
  B: "مشکلات رفتاری",
  C: "بیش‌فعالی / نقص توجه",
  D: "مشکلات با همسالان",
  E: "رفتارهای مطلوب اجتماعی"
};

function LevelBadge({ level }: { level: AssessmentScore["totalLevel"] }) {
  const variant = level === "نابهنجار" ? "danger" : level === "مرزی" ? "warning" : "success";
  return <Badge variant={variant}>{level}</Badge>;
}

export function AssessmentScoreSummary({ score, compact = false }: { score: AssessmentScore; compact?: boolean }) {
  const scales = score.subscales || [];
  return (
    <div className={compact ? "space-y-2" : "mt-3 space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm">
        <span className="text-gray-700">نمره کل مشکلات: <strong className="text-gray-900">{score.totalDifficultiesScore}</strong></span>
        <span className="flex items-center gap-2 text-gray-700">وضعیت کل: <LevelBadge level={score.totalLevel} /></span>
      </div>
      <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
        {scales.map(scale => (
          <div key={scale.domain} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            <span className="text-gray-700">{ASSESSMENT_SCALE_NAMES[scale.domain] || `مقیاس ${scale.domain}`}</span>
            <span className="flex items-center gap-2 font-medium text-gray-900">
              {scale.score}
              <LevelBadge level={scale.level} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
