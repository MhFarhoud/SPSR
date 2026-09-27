import { v4 as uuidv4 } from "uuid";
import { ActionItem, ReferralDecision, CaseStatus } from "../../types";
import { Repository } from "../repositories/Repository";
import { db } from "../db";
import { childRepository } from "../repositories/ChildRepository";

export class ActionItemRepository extends Repository<ActionItem> {
  protected getCollection(): ActionItem[] {
    return db.data.actionItems;
  }
  protected persist(): void {
    db.persist();
  }
}

export class ReferralDecisionRepository extends Repository<ReferralDecision> {
  protected getCollection(): ReferralDecision[] {
    return db.data.referralDecisions;
  }
  protected persist(): void {
    db.persist();
  }
}

export const actionItemRepository = new ActionItemRepository();
export const referralDecisionRepository = new ReferralDecisionRepository();

export class CaseManagementService {
  
  public updateChildCaseStatus(childId: string, newStatus: CaseStatus, reason: string, userId: string) {
    const child = childRepository.findById(childId);
    if (!child) throw new Error("Child not found");

    const oldStatus = child.caseStatus;
    child.caseStatus = newStatus;
    child.statusChangeReason = reason;
    child.statusChangeDate = new Date().toISOString();
    child.updatedAt = new Date().toISOString();
    
    childRepository.save(child);

    // Create Audit Log
    db.data.auditLogs.push({
      id: uuidv4(),
      entityType: "Child",
      entityId: childId,
      action: "UPDATE",
      userId,
      timestamp: new Date().toISOString(),
      oldValue: oldStatus,
      newValue: newStatus,
      reason,
      details: "Case Status Updated"
    });
    db.persist();
  }

  public createReferral(data: Omit<ReferralDecision, "id" | "createdAt">): ReferralDecision {
    const referral: ReferralDecision = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    return referralDecisionRepository.save(referral);
  }

  public createActionItem(data: Omit<ActionItem, "id" | "createdAt">): ActionItem {
    const action: ActionItem = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    return actionItemRepository.save(action);
  }
}

export const caseManagementService = new CaseManagementService();
