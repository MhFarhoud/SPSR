import type { Child, User } from "../types";
import { db } from "./db";

const CENTER_SCOPED_ROLES = new Set(["سوپروایزر"]);

export function canViewChildRecord(user: User, child: Child): boolean {
  if (user.role === "مربی") return false;
  if (user.role === "سرمربی") return Boolean(child.currentClassId && db.data.classes?.some(group => group.id === child.currentClassId && group.supervisorId === user.id));
  if (CENTER_SCOPED_ROLES.has(user.role)) {
    return (user.centerIds || []).includes(child.currentCenterId);
  }
  return true;
}
