import type { ActionItem, Child, FollowUp } from "../types";

export function isArchivedOrClosedChild(child: Pick<Child, "archived" | "activeStatus" | "caseStatus">): boolean {
  return Boolean(child.archived || child.activeStatus === "آرشیوشده" || child.caseStatus === "بایگانی" || child.caseStatus === "بسته_شده");
}

export function isFollowUpAction(action: Pick<ActionItem, "action" | "taskType">): boolean {
  return action.taskType === "فرم فالوآپ" || /فالو[\s‌-]*آپ|پیگیر/.test(action.action);
}

export function hasActiveFollowUp(childId: string, followUps: FollowUp[], actions: ActionItem[]): boolean {
  const formIsOpen = followUps.some(item => item.childId === childId
    && !["ARCHIVED", "غیرفعال", "گذشته_از_موعد"].includes(item.status)
    && item.specialistDecision !== "پایان فالوآپ و بازگشت به پایش معمول");
  const taskIsOpen = actions.some(item => item.childId === childId
    && item.status !== "انجام_شده" && item.status !== "لغوشده" && isFollowUpAction(item));
  return formIsOpen || taskIsOpen;
}

export function getActiveChildren(children: Child[]): Child[] {
  return children.filter(child => !isArchivedOrClosedChild(child));
}
