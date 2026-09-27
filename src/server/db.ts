import fs from "fs";
import path from "path";
import { AppData, User, Child, TeacherAssessment, ParentAssessment, FollowUp, AlignmentResult, ReferralDecision, FollowUpComparison, ActionItem, AuditLog, FormVersion, Center, ClassGroup, ChildEnrollment } from "../types";

const DATA_FILE = path.join(process.cwd(), "data.json");

export class Database {
  public data: AppData;

  constructor() {
    this.data = this.readData();
  }

  private readData(): AppData {
    if (!fs.existsSync(DATA_FILE)) {
      // Return default empty state if missing, though it should exist
      return {
        users: [], centers: [], classes: [], children: [], enrollments: [],
        teacherAssessments: [], parentAssessments: [], alignments: [],
        referralDecisions: [], followUps: [], followUpComparisons: [],
        actionItems: [], auditLogs: [], formVersions: [], permissions: {}
      };
    }
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    
    return {
      users: raw.users || [],
      centers: raw.centers || [],
      classes: raw.classes || [],
      children: raw.children || [],
      enrollments: raw.enrollments || [],
      teacherAssessments: raw.teacherAssessments || raw.teacherForms || [],
      parentAssessments: raw.parentAssessments || raw.parentForms || [],
      alignments: raw.alignments || [],
      referralDecisions: raw.referralDecisions || [],
      followUps: raw.followUps || [],
      followUpComparisons: raw.followUpComparisons || [],
      actionItems: raw.actionItems || [],
      auditLogs: raw.auditLogs || [],
      formVersions: raw.formVersions || [],
      permissions: raw.permissions || {}
    };
  }

  public persist() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
  }
}

export const db = new Database();
