import type { Child, User } from "../types";

const CENTER_SCOPED_ROLES = new Set(["سرمربی", "سوپروایزر"]);

export function canViewChildRecord(user: User, child: Child): boolean {
  if (user.role === "مربی") return false;
  if (CENTER_SCOPED_ROLES.has(user.role)) {
    return (user.centerIds || []).includes(child.currentCenterId);
  }
  return true;
}
