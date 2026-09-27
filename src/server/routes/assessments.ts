import express from "express";
import { db } from "../db";
import { calculateTPCS, calculatePPCS, calculateImpactScore } from "../scoringEngine";
import { compareAssessments } from "../alignmentEngine";
import { compareFollowUp, suggestFollowUpPath } from "../followUpEngine";
import { FOLLOW_UP_SCALES, followUpScaleLevel, scoreFollowUpScale } from "../../followUpScales";
import { v4 as uuidv4 } from "uuid";

export const assessmentsRouter = express.Router();

// Submit Teacher Assessment (TPCS)
assessmentsRouter.post("/teacher", (req, res) => {
  const form = req.body;
  form.score = calculateTPCS(form.answers);

  const idx = db.data.teacherAssessments.findIndex(a => a.id === form.id);
  if (idx >= 0) db.data.teacherAssessments[idx] = form;
  else db.data.teacherAssessments.push(form);
  
  // Audit log
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Assessment",
    entityId: form.id,
    action: "SUBMIT",
    userId: form.teacherId,
    timestamp: new Date().toISOString(),
    details: `Teacher assessment submitted for child ${form.childId}`
  });

  // Attempt alignment if parent form exists
  const pAssessments = db.data.parentAssessments.filter(a => a.childId === form.childId);
  if (pAssessments.length > 0) {
    const parentForm = pAssessments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (parentForm.score) {
      const alignment = compareAssessments(parentForm, form);
      db.data.alignments.push(alignment);
    }
  }

  db.persist();
  res.json({ success: true, score: form.score });
});

// Submit Parent Assessment (PPCS)
assessmentsRouter.post("/parent", (req, res) => {
  const form = req.body;
  form.score = calculatePPCS(form.answers);
  form.impactScore = calculateImpactScore(form.overallProblem, {
    q28: form.childDistressLevel || "خیر",
    q29a: form.impactOnFamilyLife || "خیر",
    q29b: form.impactOnFriendships || "خیر",
    q29c: form.impactOnLearning || "خیر",
    q29d: form.impactOnLeisure || "خیر",
    q30: form.burdenOnFamily || "خیر"
  });

  const idx = db.data.parentAssessments.findIndex(a => a.id === form.id);
  if (idx >= 0) db.data.parentAssessments[idx] = form;
  else db.data.parentAssessments.push(form);

  // Audit log
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Assessment",
    entityId: form.id,
    action: "SUBMIT",
    userId: form.parentId || "system",
    timestamp: new Date().toISOString(),
    details: `Parent assessment submitted for child ${form.childId}`
  });

  // Attempt alignment if teacher form exists
  const tAssessments = db.data.teacherAssessments.filter(a => a.childId === form.childId);
  if (tAssessments.length > 0) {
    const teacherForm = tAssessments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (teacherForm.score) {
      const alignment = compareAssessments(form, teacherForm);
      db.data.alignments.push(alignment);
    }
  }

  db.persist();
  res.json({ success: true, score: form.score, impact: form.impactScore });
});

// Submit Follow-Up
assessmentsRouter.post("/followup", (req, res) => {
  const followUp = req.body;

  if (!Array.isArray(followUp.targetDomains) || followUp.targetDomains.length < 1 || followUp.targetDomains.length > 2) {
    return res.status(400).json({ success: false, message: "یک یا دو حوزه فالوآپ باید انتخاب شود." });
  }
  if (followUp.targetDomains.some((domain: string) => !FOLLOW_UP_SCALES.some(scale => scale.domain === domain))) {
    return res.status(400).json({ success: false, message: "حوزه انتخاب‌شده معتبر نیست." });
  }
  const submittedQuestionIds = new Set((followUp.answers || []).map((answer: any) => Number(answer.questionId)));
  const requiredQuestionIds = followUp.targetDomains.flatMap((domain: string) => FOLLOW_UP_SCALES.find(scale => scale.domain === domain)!.questions);
  if (requiredQuestionIds.some((questionId: number) => !submittedQuestionIds.has(questionId)) ||
      (followUp.answers || []).some((answer: any) => !requiredQuestionIds.includes(Number(answer.questionId)) || ![0, 1, 2].includes(answer.answerValue)) ||
      submittedQuestionIds.size !== requiredQuestionIds.length) {
    return res.status(400).json({ success: false, message: "پاسخ هر پنج گویه حوزه انتخاب‌شده الزامی است." });
  }
  const scoredDomains = followUp.targetDomains.map((domain: string) => {
    const scaleScore = scoreFollowUpScale(followUp.answers || [], domain);
    return { domain, score: scaleScore, level: followUpScaleLevel(domain, scaleScore) };
  });
  followUp.scaleScores = scoredDomains;
  followUp.formType = "FOLLOWUP";
  followUp.formVersion = followUp.formVersion || "1.0.0";
  followUp.submittedAt = followUp.status === "SUBMITTED" ? new Date().toISOString() : undefined;
  followUp.followUpNumber = db.data.followUps.filter(f => f.childId === followUp.childId).length + 1;

  const idx = db.data.followUps.findIndex(f => f.id === followUp.id);
  if (idx >= 0) db.data.followUps[idx] = followUp;
  else db.data.followUps.push(followUp);

  // Calculate comparison if we have a previous assessment score
  if (followUp.previousAssessmentId) {
    const prevTeacher = db.data.teacherAssessments.find(a => a.id === followUp.previousAssessmentId);
    if (prevTeacher && prevTeacher.score) {
      for (const current of scoredDomains) {
        const domainKey = current.domain === "نشانگان هیجانی" ? "A"
          : current.domain === "مشکلات سلوک" ? "B"
          : current.domain === "بیش‌فعالی و کمبود توجه" ? "C"
          : current.domain === "مشکلات با همتایان" ? "D" : "E";
        const previous = prevTeacher.score.subscales.find(s => s.domain === domainKey);
        if (!previous) continue;
        const comparison = compareFollowUp(previous.score, current.score, { ...followUp, targetDomains: [current.domain] });
        comparison.domain = current.domain;
        comparison.levelBefore = previous.level;
        comparison.levelAfter = current.level;
        db.data.followUpComparisons.push(comparison);
      }
    }
  }

  // Audit log
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "FollowUp",
    entityId: followUp.id,
    action: followUp.status === "SUBMITTED" ? "SUBMIT" : "CREATE",
    userId: followUp.teacherId,
    timestamp: new Date().toISOString(),
    details: `Follow-up #${followUp.followUpNumber} for child ${followUp.childId}`
  });

  db.persist();
  res.json({ success: true });
});

// Get assessments for a specific child (for ChildProfile tabs)
assessmentsRouter.get("/child/:childId", (req, res) => {
  const { childId } = req.params;
  
  const teacherAssessments = db.data.teacherAssessments
    .filter(a => a.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const parentAssessments = db.data.parentAssessments
    .filter(a => a.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const alignments = db.data.alignments
    .filter(a => a.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const followUps = db.data.followUps
    .filter(f => f.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const comparisons = db.data.followUpComparisons
    .filter(c => {
      const fu = db.data.followUps.find(f => f.id === c.followUpId);
      return fu && fu.childId === childId;
    });

  const actionItems = db.data.actionItems
    .filter(a => a.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const referralDecisions = db.data.referralDecisions
    .filter(r => r.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    teacherAssessments,
    parentAssessments,
    alignments,
    followUps,
    comparisons,
    actionItems,
    referralDecisions
  });
});

// Get timeline events for a child
assessmentsRouter.get("/child/:childId/timeline", (req, res) => {
  const { childId } = req.params;
  
  const events: Array<{ date: string; type: string; title: string; details?: string }> = [];

  // Child creation
  const child = db.data.children.find(c => c.id === childId);
  if (child) {
    events.push({ date: child.createdAt, type: "child", title: "ثبت پرونده کودک" });
  }

  // Teacher assessments
  db.data.teacherAssessments.filter(a => a.childId === childId).forEach(a => {
    events.push({
      date: a.submittedAt || a.createdAt,
      type: "teacher_assessment",
      title: `فرم مربی ${a.status === "SUBMITTED" ? "ثبت شد" : "ایجاد شد"}`,
      details: a.score ? `نمره کل: ${a.score.totalDifficultiesScore} - سطح: ${a.score.totalLevel}` : undefined
    });
  });

  // Parent assessments
  db.data.parentAssessments.filter(a => a.childId === childId).forEach(a => {
    events.push({
      date: a.submittedAt || a.createdAt,
      type: "parent_assessment",
      title: `فرم والد ${a.status === "SUBMITTED" ? "ثبت شد" : "ایجاد شد"}`,
      details: a.score ? `نمره کل: ${a.score.totalDifficultiesScore} - سطح: ${a.score.totalLevel}` : undefined
    });
  });

  // Alignments
  db.data.alignments.filter(a => a.childId === childId).forEach(a => {
    events.push({
      date: a.createdAt,
      type: "alignment",
      title: "نتیجه همسویی محاسبه شد",
      details: `مسیر پیشنهادی: ${a.suggestedPath}`
    });
  });

  // Follow-ups
  db.data.followUps.filter(f => f.childId === childId).forEach(f => {
    events.push({
      date: f.submittedAt || f.createdAt,
      type: "followup",
      title: `فالوآپ #${f.followUpNumber} ${f.status === "SUBMITTED" ? "ثبت شد" : "ایجاد شد"}`,
      details: f.overallChange
    });
  });

  // Referrals
  db.data.referralDecisions.filter(r => r.childId === childId).forEach(r => {
    events.push({
      date: r.createdAt,
      type: "referral",
      title: "ارجاع ثبت شد",
      details: r.finalPath
    });
  });

  // Action items
  db.data.actionItems.filter(a => a.childId === childId).forEach(a => {
    events.push({
      date: a.createdAt,
      type: "action",
      title: `اقدام: ${a.action}`,
      details: `وضعیت: ${a.status} - مسئول: ${a.responsiblePersonId}`
    });
  });

  // Sort chronologically (newest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, events });
});
