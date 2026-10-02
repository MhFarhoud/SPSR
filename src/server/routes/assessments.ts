import express from "express";
import { db } from "../db";
import { calculateTPCS, calculatePPCS, calculateImpactScore } from "../scoringEngine";
import { compareAssessments } from "../alignmentEngine";
import { compareFollowUp, suggestFollowUpPath } from "../followUpEngine";
import { FOLLOW_UP_SCALES, followUpScaleLevel, scoreFollowUpScale } from "../../followUpScales";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser } from "../auth";

export const assessmentsRouter = express.Router();

function hasCompletePrimaryAnswers(answers: unknown): boolean {
  if (!Array.isArray(answers) || answers.length !== 25) return false;
  const questionIds = new Set<number>();
  for (const answer of answers) {
    const questionId = Number(answer?.questionId);
    if (!Number.isInteger(questionId) || questionId < 1 || questionId > 25 || questionIds.has(questionId)) return false;
    if (![0, 1, 2].includes(answer?.answerValue)) return false;
    questionIds.add(questionId);
  }
  return questionIds.size === 25;
}

// Submit Teacher Assessment (TPCS)
assessmentsRouter.post("/teacher", (req, res) => {
  const submitter = getSessionUser(req);
  if (!submitter) return res.status(401).json({ success: false, message: "برای ثبت فرم وارد سامانه شوید." });
  const form = req.body || {};
  const existingIndex = db.data.teacherAssessments.findIndex(assessment => assessment.id === form.id);
  const existingForm = existingIndex >= 0 ? db.data.teacherAssessments[existingIndex] : undefined;
  const canManageForms = ["ادمین", "تیم_تخصصی", "سرمربی"].includes(submitter.role);
  if (submitter.role !== "مربی" && !canManageForms) {
    return res.status(403).json({ success: false, message: "این نقش اجازه ثبت یا ویرایش فرم مربی را ندارد." });
  }
  if (submitter.role === "مربی" && form.teacherId !== submitter.id) {
    return res.status(403).json({ success: false, message: "مربی فقط می‌تواند فرم را با حساب خودش ثبت کند." });
  }
  if (existingForm && submitter.role === "مربی" && existingForm.teacherId !== submitter.id) {
    return res.status(403).json({ success: false, message: "فقط مربی ثبت‌کننده می‌تواند فرم را ویرایش کند." });
  }
  if (submitter.role === "مربی") {
    const childId = existingForm?.childId || form.childId;
    const childIsAssigned = db.data.children.some(child => child.id === childId && db.data.classes?.some(group => group.id === child.currentClassId && group.teacherId === submitter.id));
    if (!childIsAssigned) return res.status(403).json({ success: false, message: "این کودک به کلاس‌های شما اختصاص داده نشده است." });
  }
  if (!hasCompletePrimaryAnswers(form.answers)) {
    return res.status(400).json({ success: false, message: "برای محاسبه نتیجه باید به هر ۲۵ گویه پاسخ معتبر داده شود." });
  }
  const now = new Date().toISOString();
  const savedForm = {
    ...existingForm,
    ...form,
    id: existingForm?.id || form.id || uuidv4(),
    childId: existingForm?.childId || form.childId,
    teacherId: existingForm?.teacherId || form.teacherId,
    centerId: existingForm?.centerId || form.centerId,
    createdAt: existingForm?.createdAt || form.createdAt || now,
    updatedAt: now,
    submittedAt: now,
    status: "SUBMITTED" as const,
    score: calculateTPCS(form.answers)
  };
  if (existingForm) db.data.teacherAssessments[existingIndex] = savedForm;
  else db.data.teacherAssessments.push(savedForm);

  // Audit log
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Assessment",
    entityId: savedForm.id,
    action: existingForm ? "UPDATE" : "SUBMIT",
    userId: submitter.id,
    timestamp: now,
    details: existingForm ? `فرم دیدگاه مربی ویرایش شد (کودک ${savedForm.childId})` : `فرم دیدگاه مربی ثبت شد (کودک ${savedForm.childId})`
  });

  // Editing a form invalidates alignments that were calculated from its old answers.
  if (existingForm) {
    db.data.alignments = db.data.alignments.filter(alignment => alignment.teacherAssessmentId !== savedForm.id);
  }

  // Recompute against the latest parent form so the case status follows the edited answers.
  const parentForm = db.data.parentAssessments
    .filter(assessment => assessment.childId === savedForm.childId && assessment.score)
    .sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime())[0];
  if (parentForm?.score) {
    db.data.alignments.push(compareAssessments(parentForm, savedForm));
  }

  db.persist();
  if (submitter.role === "مربی") return res.json({ success: true });
  res.json({ success: true, score: savedForm.score });
});

assessmentsRouter.delete("/teacher/:id", (req, res) => {
  const submitter = getSessionUser(req);
  if (!submitter) return res.status(401).json({ success: false, message: "برای حذف فرم وارد سامانه شوید." });
  const index = db.data.teacherAssessments.findIndex(assessment => assessment.id === req.params.id);
  if (index < 0) return res.status(404).json({ success: false, message: "فرم مربی پیدا نشد." });
  const form = db.data.teacherAssessments[index];
  const canManageForms = ["ادمین", "تیم_تخصصی", "سرمربی"].includes(submitter.role);
  if (submitter.role === "مربی") {
    if (form.teacherId !== submitter.id) return res.status(403).json({ success: false, message: "فقط مربی ثبت‌کننده می‌تواند فرم را حذف کند." });
    const assigned = db.data.children.some(child => child.id === form.childId && db.data.classes?.some(group => group.id === child.currentClassId && group.teacherId === submitter.id));
    if (!assigned) return res.status(403).json({ success: false, message: "این کودک دیگر به کلاس‌های شما اختصاص داده نشده است." });
  } else if (!canManageForms) {
    return res.status(403).json({ success: false, message: "این نقش اجازه حذف فرم مربی را ندارد." });
  }

  db.data.teacherAssessments.splice(index, 1);
  db.data.alignments = db.data.alignments.filter(alignment => alignment.teacherAssessmentId !== form.id);
  db.data.followUps.forEach(followUp => {
    if (followUp.previousAssessmentId === form.id) {
      followUp.previousAssessmentId = undefined;
      followUp.previousAssessmentType = undefined;
    }
  });
  db.data.auditLogs.push({
    id: uuidv4(), entityType: "Assessment", entityId: form.id, action: "DELETE",
    userId: submitter.id, timestamp: new Date().toISOString(),
    details: `فرم دیدگاه مربی حذف شد (کودک ${form.childId})`
  });
  db.persist();
  res.json({ success: true });
});

// Submit Parent Assessment (PPCS)
assessmentsRouter.post("/parent", (req, res) => {
  const { verificationNationalId, ...form } = req.body || {};
  const submitter = getSessionUser(req);
  if (form.parentId !== "parent" && !submitter) return res.status(401).json({ success: false, message: "برای ثبت فرم وارد سامانه شوید." });
  if (submitter?.role === "مربی") return res.status(403).json({ success: false, message: "مربی به فرم ارزیابی والد دسترسی ندارد." });
  if (!hasCompletePrimaryAnswers(form.answers)) {
    return res.status(400).json({ success: false, message: "برای محاسبه نتیجه باید به هر ۲۵ گویه پاسخ معتبر داده شود." });
  }
  const linkedChild = db.data.children.find(child => child.id === form.childId);
  if (!linkedChild) return res.status(404).json({ success: false, message: "پرونده کودک پیدا نشد." });
  if (form.parentId === "parent" && (!verificationNationalId || linkedChild.nationalId !== verificationNationalId)) {
    return res.status(401).json({ success: false, message: "برای ثبت فرم، از لینک اختصاصی والد و کد ملی کودک استفاده کنید." });
  }
  if (verificationNationalId && linkedChild.nationalId !== verificationNationalId) {
    return res.status(401).json({ success: false, message: "کد ملی با پرونده کودک تطبیق ندارد." });
  }
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
  if (form.parentId === "parent") return res.json({ success: true });
  res.json({ success: true, score: form.score, impact: form.impactScore });
});

// Submit Follow-Up
assessmentsRouter.post("/followup", (req, res) => {
  const submitter = getSessionUser(req);
  if (!submitter) return res.status(401).json({ success: false, message: "برای ثبت فالوآپ وارد سامانه شوید." });
  if (submitter.role === "مربی") return res.status(403).json({ success: false, message: "این نقش فقط به فرم دیدگاه مربی دسترسی دارد." });
  const followUp = req.body;

  const validReasons = ["نمره مرزی یا نابهنجار در فرم مربی", "نمره مرزی یا نابهنجار در فرم والد", "اختلاف بین فرم والد و مربی", "نمره تأثیر بالا", "نگرانی ثبت‌شده مربی", "تصمیم سرمربی یا تیم تخصصی", "پیگیری پس از ارائه راهکار", "پیگیری پس از شروع خدمات تخصصی", "بروز نشانه جدید"];
  if (!validReasons.includes(followUp.triggerReason)) return res.status(400).json({ success: false, message: "دلیل شروع فالوآپ را مشخص کنید." });
  if (!followUp.childId || !db.data.children.some(child => child.id === followUp.childId)) return res.status(400).json({ success: false, message: "پرونده کودک معتبر نیست." });
  if (!Array.isArray(followUp.targetBehaviors) || !followUp.targetBehaviors.some((behavior: unknown) => typeof behavior === "string" && behavior.trim())) return res.status(400).json({ success: false, message: "رفتار هدف را مشخص کنید." });
  if (followUp.newBehaviorObserved && !String(followUp.newBehaviorDescription || "").trim()) return res.status(400).json({ success: false, message: "توضیح کوتاه رفتار جدید الزامی است." });
  if (Array.isArray(followUp.newBehaviorKeywords) && followUp.newBehaviorKeywords.length > 3) return res.status(400).json({ success: false, message: "حداکثر سه واژه کلیدی برای رفتار جدید وارد کنید." });

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
    const previousAssessment = followUp.previousAssessmentType === "PPCS"
      ? db.data.parentAssessments.find(a => a.id === followUp.previousAssessmentId)
      : db.data.teacherAssessments.find(a => a.id === followUp.previousAssessmentId);
    if (previousAssessment && previousAssessment.childId !== followUp.childId) {
      return res.status(400).json({ success: false, message: "ارزیابی پایه متعلق به این پرونده کودک نیست." });
    }
    if (previousAssessment?.score) {
      for (const current of scoredDomains) {
        const domainKey = current.domain === "نشانگان هیجانی" ? "A"
          : current.domain === "مشکلات سلوک" ? "B"
          : current.domain === "بیش‌فعالی و کمبود توجه" ? "C"
          : current.domain === "مشکلات با همتایان" ? "D" : "E";
        const previous = previousAssessment.score.subscales.find(s => s.domain === domainKey);
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
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده نتیجه وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "مربی فقط مجاز به تکمیل فرم ارزیابی است و به نتایج دسترسی ندارد." });
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
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده نتیجه وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "مربی به تاریخچه و وضعیت ارزیابی دسترسی ندارد." });
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
