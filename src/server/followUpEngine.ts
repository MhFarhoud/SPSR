import { FollowUp, FollowUpComparison } from "../types";
import { v4 as uuidv4 } from "uuid";

export function compareFollowUp(
  initialScore: number,
  followUpScore: number,
  followUp: FollowUp
): FollowUpComparison {
  const delta = initialScore - followUpScore;
  
  // Note: For Prosocial (E), increase is improvement. For others, decrease is improvement.
  // We assume targetDomains determines this. We'll simplify logic assuming standard domains for now.
  const isProsocial = followUp.targetDomains.includes("رفتارهای جامعه‌پسند");
  let direction: "بهبود" | "تشدید" | "ثابت" = "ثابت";

  if (delta === 0) direction = "ثابت";
  else if ((!isProsocial && delta > 0) || (isProsocial && delta < 0)) direction = "بهبود";
  else direction = "تشدید";

  let resultCategory: FollowUpComparison["resultCategory"] = "بدون تغییر معنادار";

  if (followUp.newBehaviorObserved && followUp.requiresImmediateReport) {
    resultCategory = "بروز نشانه جدی";
  } else if (direction === "تشدید" || followUp.overallChange === "خیلی بدتر شده است." || followUp.overallChange === "کمی بدتر شده است.") {
    resultCategory = "تشدید";
  } else if (followUp.effectiveness === "برای قضاوت زود است." || followUp.effectiveness === "اطلاعی ندارم.") {
    resultCategory = "نتیجه نامشخص به‌دلیل کوتاه‌بودن مدت مداخله";
  } else if (followUp.effectiveness === "هنوز اقدامی انجام نشده است." || followUp.implementationLevel === "اجرا نشده‌اند." || followUp.implementationLevel === "به میزان کم اجرا شده‌اند." || followUp.implementationLevel === "هنوز راهکاری پیشنهاد نشده است." || followUp.implementationLevel === "اطلاعی ندارم.") {
    resultCategory = "نتیجه نامشخص به‌دلیل اجرا نشدن راهکار";
  } else if (direction === "بهبود" && (followUp.overallChange === "خیلی بهتر شده است.")) {
    resultCategory = "بهبود واضح";
  } else if (direction === "بهبود" || followUp.overallChange === "کمی بهتر شده است.") {
    resultCategory = "بهبود نسبی";
  }

  return {
    id: uuidv4(),
    followUpId: followUp.id,
    initialScore,
    followUpScore,
    delta,
    direction,
    levelBefore: "ناشخص", // To be filled by caller
    levelAfter: "ناشخص",
    behaviorBefore: followUp.targetBehaviors.join(", "),
    behaviorAfter: followUp.overallChange,
    distressBeforeAfter: followUp.childDistress,
    functionalImpactBeforeAfter: followUp.impactOnLearning,
    resultCategory
  };
}

export function suggestFollowUpPath(comparison: FollowUpComparison): string {
  switch (comparison.resultCategory) {
    case "بهبود واضح":
      return "پایان فالوآپ و بازگشت به پایش معمول";
    case "بهبود نسبی":
      return "ادامه فالوآپ در همان حوزه";
    case "نتیجه نامشخص به‌دلیل اجرا نشدن راهکار":
      return "رفع مانع اجرا و تکرار فالوآپ";
    case "بدون تغییر معنادار":
      return "بررسی تیم تخصصی یا تغییر مسیر";
    case "تشدید":
    case "بروز نشانه جدی":
      return "بررسی سریع‌تر";
    default:
      return "بررسی تیم تخصصی یا تغییر مسیر";
  }
}
