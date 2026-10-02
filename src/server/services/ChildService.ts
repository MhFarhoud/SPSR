import { v4 as uuidv4 } from "uuid";
import { Child, CaseStatus, Priority } from "../../types";
import { childRepository } from "../repositories/ChildRepository";
import { userRepository } from "../repositories/UserRepository";
import { db } from "../db";
import { withEffectiveCaseStatus } from "./ChildClassification";

export class ChildService {
  /**
   * Generates a readable CH-XXXXXX ID
   */
  private generateChildId(): string {
    const totalChildren = childRepository.findAll().length;
    // Simple incremental ID based on count. In a real DB, we'd use a sequence.
    const seq = totalChildren + 1;
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
      caseStatus: "عادی" as CaseStatus,
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

  public listChildren(page: number, pageSize: number, search?: string, userId?: string, archived = false, status?: string) {
    let allowedCenterIds: string[] | null = null; // null means all
    let allowedClassIds: string[] | null = null; // null means all

    if (userId) {
      const user = userRepository.findById(userId);
      if (user) {
        if (user.role === "سرمربی") {
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
        if (!!child.archived !== archived) return false;
        if (status && withEffectiveCaseStatus(child, db.data.alignments, [...db.data.teacherAssessments, ...db.data.parentAssessments]).caseStatus !== status) return false;
        if (allowedCenterIds && !allowedCenterIds.includes(child.currentCenterId)) return false;
        if (allowedClassIds && (!child.currentClassId || !allowedClassIds.includes(child.currentClassId))) return false;

        if (!search) return true;
        const s = search.toLowerCase();
        return (
          child.firstName.toLowerCase().includes(s) ||
          child.lastName.toLowerCase().includes(s) ||
          (child.childId || "").toLowerCase().includes(s)
        );
      },
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const assessments = [...db.data.teacherAssessments, ...db.data.parentAssessments];
    return { ...result, data: result.data.map(child => withEffectiveCaseStatus(child, db.data.alignments, assessments)) };
  }
}

export const childService = new ChildService();
