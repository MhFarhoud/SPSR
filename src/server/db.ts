import fs from "fs";
import path from "path";
import { AppData, User, Child, TeacherAssessment, ParentAssessment, FollowUp, AlignmentResult, ReferralDecision, FollowUpComparison, ActionItem, AuditLog, FormVersion, Center, ClassGroup, ChildEnrollment } from "../types";
import { calculatePPCS, calculateTPCS } from "./scoringEngine";

const DATA_FILE = path.join(process.cwd(), "data.json");

export class Database {
  public data: AppData;

  constructor() {
    this.data = this.readData();
    this.repairAssessmentScores();
  }

  private repairAssessmentScores() {
    const hasCompleteAnswers = (answers: unknown) => {
      if (!Array.isArray(answers) || answers.length !== 25) return false;
      const ids = new Set<number>();
      return answers.every(answer => {
        const id = Number(answer?.questionId);
        if (!Number.isInteger(id) || id < 1 || id > 25 || ids.has(id) || ![0, 1, 2].includes(answer?.answerValue)) return false;
        ids.add(id);
        return true;
      }) && ids.size === 25;
    };

    let changed = false;
    this.data.teacherAssessments = this.data.teacherAssessments.map(form => {
      if (!hasCompleteAnswers(form.answers)) return form;
      const score = calculateTPCS(form.answers);
      if (JSON.stringify(form.score) === JSON.stringify(score)) return form;
      changed = true;
      return { ...form, score };
    });
    this.data.parentAssessments = this.data.parentAssessments.map(form => {
      if (!hasCompleteAnswers(form.answers)) return form;
      const score = calculatePPCS(form.answers);
      if (JSON.stringify(form.score) === JSON.stringify(score)) return form;
      changed = true;
      return { ...form, score };
    });

    if (changed) this.persist();
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
