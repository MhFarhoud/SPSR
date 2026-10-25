import { v4 as uuidv4 } from "uuid";
import { Child, CaseStatus, Priority } from "../../types";
import { childRepository } from "../repositories/ChildRepository";
import { userRepository } from "../repositories/UserRepository";
import { db } from "../db";
import { withEffectiveCaseStatus } from "./ChildClassification";
import { hasActiveFollowUp, isArchivedOrClosedChild } from "../../domain/caseLifecycle";

export class ChildService {
  /**
   * Generates a readable CH-XXXXXX ID
   */
  private generateChildId(): string {
    const seq = childRepository.findAll().reduce((max, child) => {
      const current = Number((child.childId || "").match(/^CH-(\d+)$/)?.[1] || 0);
      return Math.max(max, current);
    }, 0) + 1;
    return `CH-${seq.toString().padStart(6, '0')}`;
  }

  public registerChild(data: Omit<Child, "id" | "childId" | "createdAt" | "updatedAt" | "caseStatus" | "priority">): Child {
    // Basic Duplicate Detection (First Name + Last Name + BirthDate)
    const possibleDuplicate = childRepository.findAll().find(c => 
      c.firstName === data.firstName &&
      c.lastName === data.lastName &&
      c.birthDate === data.birthDate
    );

    if (possibleDuplicate) {
      throw new Error(`احتمال پرونده تکراری: کودکی با نام ${data.firstName} ${data.lastName} و تاریخ تولد ${data.birthDate} قبلاً ثبت شده است.`);
    }

    const newChild: Child = {
      ...data,
      id: uuidv4(),
      childId: this.generateChildId(),
      caseStatus: "در_حال_ارزیابی" as CaseStatus,
      priority: "عادی" as Priority,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return childRepository.save(newChild);
  }

  public getChild(id: string): Child | undefined {
    return childRepository.findById(id);
  }

  public listChildren(page: number, pageSize: number, search?: string, userId?: string, archived = false, status?: string, centerId?: string, classId?: string) {
    let allowedCenterIds: string[] | null = null; // null means all
    let allowedClassIds: string[] | null = null; // null means all

    if (userId) {
      const user = userRepository.findById(userId);
      if (user) {
        if (user.role === "سرمربی" || user.role === "سوپروایزر") {
          allowedCenterIds = user.centerIds;
        } else if (user.role === "مربی") {
          const userClasses = db.data.classes?.filter(c => c.teacherId === user.id) || [];
          allowedClassIds = userClasses.map(c => c.id);
        }
      }
    }

    const result = childRepository.findPaginated(
      page, 
      pageSize,
      (child) => {
        if (isArchivedOrClosedChild(child) !== archived) return false;
        const effectiveStatus = withEffectiveCaseStatus(child, db.data.alignments, [...db.data.teacherAssessments, ...db.data.parentAssessments], db.data.followUps).caseStatus;
        const matchesStatus = !status
          || (status === "فالوآپ" && hasActiveFollowUp(child.id, db.data.followUps, db.data.actionItems))
          || (status === "نیازمند_بررسی" && ["نیازمند_بررسی", "بررسی_تخصصی"].includes(effectiveStatus || ""))
          || (status === "مداخله" && (effectiveStatus === "مداخله" || db.data.actionItems.some(action => action.childId === child.id && action.taskType === "اجرای راهکار" && !["انجام_شده", "لغوشده"].includes(action.status))))
          || effectiveStatus === status;
        if (!matchesStatus) return false;
        if (allowedCenterIds && !allowedCenterIds.includes(child.currentCenterId)) return false;
        if (allowedClassIds && (!child.currentClassId || !allowedClassIds.includes(child.currentClassId))) return false;
        if (centerId && child.currentCenterId !== centerId) return false;
        if (classId && child.currentClassId !== classId) return false;

        if (!search) return true;
        const s = search.toLowerCase();
        return (
          child.firstName.toLowerCase().includes(s) ||
          child.lastName.toLowerCase().includes(s) ||
          `${child.firstName} ${child.lastName}`.toLowerCase().includes(s) ||
          (child.childId || "").toLowerCase().includes(s) ||
          child.id.toLowerCase().includes(s)
        );
      },
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const assessments = [...db.data.teacherAssessments, ...db.data.parentAssessments];
    return { ...result, data: result.data.map(child => withEffectiveCaseStatus(child, db.data.alignments, assessments, db.data.followUps)) };
  }
}

export const childService = new ChildService();
