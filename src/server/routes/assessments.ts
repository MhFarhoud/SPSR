import express from "express";
import { db } from "../db";
import { calculateTPCS, calculatePPCS, calculateImpactScore } from "../scoringEngine";
import { compareAssessments } from "../alignmentEngine";
import { compareFollowUp, suggestFollowUpPath } from "../followUpEngine";
import { FOLLOW_UP_SCALES, followUpScaleLevel, scoreFollowUpScale } from "../../followUpScales";
import { calculateAseba, isCompleteAseba } from "../../domain/aseba";
import type { AsebaAssessment, AsebaFormType } from "../../types";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser } from "../auth";
import { canViewChildRecord } from "../access";

export const assessmentsRouter = express.Router();

assessmentsRouter.post("/aseba", (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || ["والد", "درمانگر"].includes(actor.role)) return res.status(403).json({ success: false, message: "اجازه ثبت این فرم را ندارید." });
  const body = req.body as Partial<AsebaAssessment>;
  const formType = body.formType as AsebaFormType;
  if (!['CBCL', 'TRF'].includes(formType)) return res.status(400).json({ success: false, message: "نوع فرم معتبر نیست." });
  if (actor.role === "مربی" && formType !== "TRF") return res.status(403).json({ success: false, message: "مربی فقط می‌تواند فرم TRF را تکمیل کند." });
  const child = db.data.children.find(item => item.id === body.childId);
  if (!child || !canViewChildRecord(actor, child)) return res.status(403).json({ success: false, message: "کودک در محدوده دسترسی شما نیست." });
  if (!Array.isArray(body.answers) || !isCompleteAseba({ answers: body.answers })) return res.status(400).json({ success: false, message: "پاسخ هر ۱۱۳ گویه و ۸ زیرگویه جسمانی باید ثبت شود." });
  if (body.answers.some(answer => ![0,1,2].includes(Number(answer.answerValue)))) return res.status(400).json({ success: false, message: "مقدار پاسخ گویه معتبر نیست." });
  if (formType === "TRF" && (!Array.isArray(body.adaptiveScores) || body.adaptiveScores.length !== 4 || body.adaptiveScores.some(value => !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 7))) {
    return res.status(400).json({ success: false, message: "چهار مؤلفه عملکرد انطباقی باید با نمره ۱ تا ۷ ثبت شوند." });
  }
  const existingIndex = db.data.asebaAssessments.findIndex(item => item.id === body.id);
  const now = new Date().toISOString();
  const assessment: AsebaAssessment = {
    id: existingIndex >= 0 ? db.data.asebaAssessments[existingIndex].id : body.id || uuidv4(),
    childId: child.id,
    respondentId: actor.id,
    formType,
    formVersion: "1.0.0",
    status: "SUBMITTED",
    answers: body.answers,
    adaptiveScores: formType === "TRF" ? body.adaptiveScores?.map(Number) : undefined,
    score: calculateAseba(formType, body.answers, child.gender, body.adaptiveScores?.map(Number)),
    createdAt: existingIndex >= 0 ? db.data.asebaAssessments[existingIndex].createdAt : now,
    submittedAt: now,
  };
  if (existingIndex >= 0) {
    if (db.data.asebaAssessments[existingIndex].childId !== child.id || db.data.asebaAssessments[existingIndex].formType !== formType) return res.status(400).json({ success: false, message: "انتقال فرم به کودک یا نوع دیگر مجاز نیست." });
    db.data.asebaAssessments[existingIndex] = assessment;
  } else db.data.asebaAssessments.push(assessment);

  const existingReviewTaskIndex = db.data.actionItems.findIndex(item => item.sourceId === assessment.id && item.caseStage === "بررسی جامع ASEBA");
  const needsRapidReview = assessment.score.rapidReviewFlags.length > 0;
  const needsSpecialistReview = assessment.score.specialistFlags.length > 0;
  if (needsRapidReview || needsSpecialistReview) {
    const responsible = db.data.users.find(user => user.role === "تیم_تخصصی" && user.isActive !== false)
      || db.data.users.find(user => user.role === "ادمین" && user.isActive !== false)
      || actor;
    const flaggedQuestions = [...new Set([
      ...assessment.score.rapidReviewFlags.map(flag => flag.questionId),
      ...assessment.score.specialistFlags.map(flag => flag.questionId),
    ])].sort((a, b) => a - b);
    const dueDate = new Date(Date.now() + (needsRapidReview ? 24 : 72) * 60 * 60 * 1000).toISOString();
    const reviewTask = {
      id: existingReviewTaskIndex >= 0 ? db.data.actionItems[existingReviewTaskIndex].id : uuidv4(),
      childId: child.id,
      sourceId: assessment.id,
      action: `${needsRapidReview ? "بررسی سریع" : "بررسی تخصصی"} خروجی ${formType}؛ گویه‌های علامت‌دار: ${flaggedQuestions.join("، ")}`,
      responsiblePersonId: responsible.id,
      creatorId: actor.id,
      taskType: "اقدام اجرایی" as const,
      caseStage: "بررسی جامع ASEBA",
      dueDate,
      status: "نیازمند_بازبینی" as const,
      createdAt: existingReviewTaskIndex >= 0 ? db.data.actionItems[existingReviewTaskIndex].createdAt : now,
    };
    if (existingReviewTaskIndex >= 0) db.data.actionItems[existingReviewTaskIndex] = reviewTask;
    else db.data.actionItems.push(reviewTask);
  } else if (existingReviewTaskIndex >= 0) {
    db.data.actionItems.splice(existingReviewTaskIndex, 1);
  }
  db.data.auditLogs.push({ id: uuidv4(), entityType: "Assessment", entityId: assessment.id, action: existingIndex >= 0 ? "UPDATE" : "SUBMIT", userId: actor.id, timestamp: now, details: `فرم ${formType} برای کودک ${child.childId || child.id} ثبت شد.` });
  db.persist();
  res.json({ success: true, assessment });
});

assessmentsRouter.delete("/aseba/:id", (req, res) => {
  const actor = getSessionUser(req);
  if (!actor) return res.status(401).json({ success: false, message: "برای حذف فرم وارد سامانه شوید." });
  const index = db.data.asebaAssessments.findIndex(item => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ success: false, message: "فرم جامع پیدا نشد." });
  const assessment = db.data.asebaAssessments[index];
  const child = db.data.children.find(item => item.id === assessment.childId);
  const canManage = ["ادمین", "تیم_تخصصی", "سرمربی", "سوپروایزر"].includes(actor.role);
  const isOwnTeacherForm = actor.role === "مربی" && assessment.formType === "TRF" && assessment.respondentId === actor.id;
  if ((!canManage && !isOwnTeacherForm) || !child || !canViewChildRecord(actor, child)) {
    return res.status(403).json({ success: false, message: "اجازه حذف این فرم را ندارید." });
  }
  db.data.asebaAssessments.splice(index, 1);
  db.data.actionItems = db.data.actionItems.filter(item => item.sourceId !== assessment.id);
  db.data.auditLogs.push({ id: uuidv4(), entityType: "Assessment", entityId: assessment.id, action: "DELETE", userId: actor.id, timestamp: new Date().toISOString(), details: `فرم جامع ${assessment.formType} برای کودک ${child.childId || child.id} حذف شد.` });
  db.persist();
  res.json({ success: true });
});

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

assessmentsRouter.delete("/parent/:id", (req, res) => {
  const actor = getSessionUser(req);
  if (!actor) return res.status(401).json({ success: false, message: "برای حذف فرم وارد سامانه شوید." });
  if (!["ادمین", "تیم_تخصصی"].includes(actor.role)) return res.status(403).json({ success: false, message: "فقط ادمین یا تیم تخصصی می‌تواند فرم والد را حذف کند." });
  const index = db.data.parentAssessments.findIndex(form => form.id === req.params.id);
  if (index < 0) return res.status(404).json({ success: false, message: "فرم والد پیدا نشد." });
  const form = db.data.parentAssessments[index];
  db.data.parentAssessments.splice(index, 1);
  db.data.alignments = db.data.alignments.filter(alignment => alignment.parentAssessmentId !== form.id);
  db.data.followUps.forEach(followUp => {
    if (followUp.previousAssessmentId === form.id) {
      followUp.previousAssessmentId = undefined;
      followUp.previousAssessmentType = undefined;
    }
  });
  db.data.auditLogs.push({ id: uuidv4(), entityType: "Assessment", entityId: form.id, action: "DELETE", userId: actor.id, timestamp: new Date().toISOString(), details: `فرم والد حذف شد (کودک ${form.childId})` });
  db.persist();
  res.json({ success: true });
});

// Submit Follow-Up
assessmentsRouter.post("/followup", (req, res) => {
  const submitter = getSessionUser(req);
  if (!submitter) return res.status(401).json({ success: false, message: "برای ثبت فالوآپ وارد سامانه شوید." });
  const followUp = { ...req.body };
  const existingIndex = db.data.followUps.findIndex(item => item.id === followUp.id);
  const existingFollowUp = existingIndex >= 0 ? db.data.followUps[existingIndex] : undefined;
  if (existingFollowUp) {
    if (!["ادمین", "تیم_تخصصی", "سرمربی", "سوپروایزر"].includes(submitter.role)) return res.status(403).json({ success: false, message: "ویرایش فرم ثبت‌شده فقط برای نقش‌های مدیریتی مجاز است." });
    const child = db.data.children.find(item => item.id === existingFollowUp.childId);
    if (!child || !canViewChildRecord(submitter, child)) return res.status(403).json({ success: false, message: "به پروندهٔ این کودک دسترسی ندارید." });
    if (followUp.childId !== existingFollowUp.childId) return res.status(400).json({ success: false, message: "فرم فالوآپ به پروندهٔ دیگری قابل انتقال نیست." });
  }
  let assignedFollowUpAction: (typeof db.data.actionItems)[number] | undefined;
  if (submitter.role === "مربی") {
    assignedFollowUpAction = db.data.actionItems.find(item => item.id === followUp.actionItemId
      && item.childId === followUp.childId
      && item.responsiblePersonId === submitter.id
      && item.status !== "انجام_شده"
      && (item.taskType === "فرم فالوآپ" || /فالو[\s‌-]*آپ|پیگیر/.test(item.action)));
    if (!assignedFollowUpAction) {
      return res.status(403).json({ success: false, message: "برای ثبت فالوآپ باید وظیفهٔ فعال فالوآپ این کودک به حساب شما ارجاع شده باشد." });
    }
    followUp.teacherId = submitter.id;
    delete followUp.specialistDecision;
    const previousAssessment = [...db.data.teacherAssessments, ...db.data.parentAssessments]
      .filter(item => item.childId === followUp.childId && item.score)
      .sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime())[0];
    if (previousAssessment) {
      followUp.previousAssessmentId = previousAssessment.id;
      followUp.previousAssessmentType = previousAssessment.formType === "TPCS" ? "TPCS" : "PPCS";
    }
  }

  const validReasons = ["نمره مرزی یا نابهنجار در فرم مربی", "نمره مرزی یا نابهنجار در فرم والد", "اختلاف بین فرم والد و مربی", "نمره تأثیر بالا", "نگرانی ثبت‌شده مربی", "تصمیم سرمربی یا تیم تخصصی", "پیگیری پس از ارائه راهکار", "پیگیری پس از شروع خدمات تخصصی", "بروز نشانه جدید"];
  if (!validReasons.includes(followUp.triggerReason)) return res.status(400).json({ success: false, message: "دلیل شروع فالوآپ را مشخص کنید." });
  if (!followUp.childId || !db.data.children.some(child => child.id === followUp.childId)) return res.status(400).json({ success: false, message: "پرونده کودک معتبر نیست." });
  if (!Array.isArray(followUp.targetBehaviors) || !followUp.targetBehaviors.some((behavior: unknown) => typeof behavior === "string" && behavior.trim())) return res.status(400).json({ success: false, message: "رفتار هدف را مشخص کنید." });
  if (followUp.newBehaviorObserved && !String(followUp.newBehaviorDescription || "").trim()) return res.status(400).json({ success: false, message: "توضیح کوتاه رفتار جدید الزامی است." });
  if (Array.isArray(followUp.newBehaviorKeywords) && followUp.newBehaviorKeywords.length > 3) return res.status(400).json({ success: false, message: "حداکثر سه واژه کلیدی برای رفتار جدید وارد کنید." });

  if (!Array.isArray(followUp.targetDomains) || followUp.targetDomains.length < 1) {
    return res.status(400).json({ success: false, message: "حداقل یک حوزه فالوآپ باید انتخاب شود." });
  }
  const scoredTargetDomains = followUp.targetDomains.filter((domain: string) => domain !== "مشاهده تکمیلی خارج از گویه‌های اصلی");
  if (followUp.targetDomains.some((domain: string) => domain !== "مشاهده تکمیلی خارج از گویه‌های اصلی" && !FOLLOW_UP_SCALES.some(scale => scale.domain === domain))) {
    return res.status(400).json({ success: false, message: "حوزه انتخاب‌شده معتبر نیست." });
  }
  if (followUp.targetDomains.includes("مشاهده تکمیلی خارج از گویه‌های اصلی") && !String(followUp.additionalObservation || "").trim()) return res.status(400).json({ success: false, message: "شرح مشاهدهٔ تکمیلی الزامی است." });
  const submittedQuestionIds = new Set((followUp.answers || []).map((answer: any) => Number(answer.questionId)));
  const requiredQuestionIds = scoredTargetDomains.flatMap((domain: string) => FOLLOW_UP_SCALES.find(scale => scale.domain === domain)!.questions);
  if (requiredQuestionIds.some((questionId: number) => !submittedQuestionIds.has(questionId)) ||
      (followUp.answers || []).some((answer: any) => !requiredQuestionIds.includes(Number(answer.questionId)) || ![0, 1, 2].includes(answer.answerValue)) ||
      submittedQuestionIds.size !== requiredQuestionIds.length) {
    return res.status(400).json({ success: false, message: "پاسخ هر پنج گویه حوزه انتخاب‌شده الزامی است." });
  }
  const scoredDomains = scoredTargetDomains.map((domain: string) => {
    const scaleScore = scoreFollowUpScale(followUp.answers || [], domain);
    return { domain, score: scaleScore, level: followUpScaleLevel(domain, scaleScore) };
  });
  followUp.scaleScores = scoredDomains;
  followUp.formType = "FOLLOWUP";
  followUp.formVersion = followUp.formVersion || "1.0.0";
  followUp.submittedAt = followUp.status === "SUBMITTED" ? new Date().toISOString() : undefined;
  followUp.followUpNumber = db.data.followUps.filter(f => f.childId === followUp.childId).length + 1;

  followUp.id = existingFollowUp?.id || followUp.id || uuidv4();
  followUp.teacherId = existingFollowUp?.teacherId || followUp.teacherId || submitter.id;
  followUp.createdAt = existingFollowUp?.createdAt || followUp.createdAt || new Date().toISOString();
  followUp.followUpNumber = existingFollowUp?.followUpNumber || db.data.followUps.filter(f => f.childId === followUp.childId).length + 1;
  if (existingFollowUp) db.data.followUps[existingIndex] = followUp;
  else db.data.followUps.push(followUp);
  if (existingFollowUp) db.data.followUpComparisons = db.data.followUpComparisons.filter(item => item.followUpId !== existingFollowUp.id);

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
    action: existingFollowUp ? "UPDATE" : followUp.status === "SUBMITTED" ? "SUBMIT" : "CREATE",
    userId: submitter.id,
    timestamp: new Date().toISOString(),
    details: `${existingFollowUp ? "فرم فالوآپ ویرایش شد" : "فرم فالوآپ ثبت شد"} #${followUp.followUpNumber} (کودک ${followUp.childId})`
  });

  if (assignedFollowUpAction) {
    assignedFollowUpAction.status = "انجام_شده";
    assignedFollowUpAction.resultNotes = "فرم فالوآپ ثبت شد.";
  }

  db.persist();
  res.json({ success: true });
});

// Record the specialist's final decision separately from the system suggestion.
assessmentsRouter.put("/alignment/:id/decision", (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || !["ادمین", "تیم_تخصصی", "سوپروایزر", "سرمربی"].includes(actor.role)) {
    return res.status(403).json({ success: false, message: "اجازه ثبت تصمیم نهایی را ندارید." });
  }
  const alignment = db.data.alignments.find(item => item.id === req.params.id);
  if (!alignment) return res.status(404).json({ success: false, message: "نتیجه همسویی پیدا نشد." });
  const child = db.data.children.find(item => item.id === alignment.childId);
  if (!child || !canViewChildRecord(actor, child)) return res.status(403).json({ success: false, message: "این پرونده در محدوده دسترسی شما نیست." });
  const finalPath = req.body?.finalPath as typeof alignment.suggestedPath;
  const validPaths = ["پایش عادی", "بررسی حوزه مرزی و مشاهده هدفمند فضای کلاس", "بررسی شرایط خانه و گفت‌وگوی سرمربی با والد", "ورود به رصد و فالوآپ", "بررسی فوری‌تر محیط مرکز و گزارش مربی", "بررسی شرایط خانه و مصاحبه تکمیلی با والد", "بررسی تکمیلی و احتمال ورود به مسیر زرد یا قرمز", "بررسی تخصصی و تعیین شدت ارجاع"];
  if (!validPaths.includes(finalPath)) return res.status(400).json({ success: false, message: "مسیر نهایی معتبر نیست." });
  const decisionReason = String(req.body?.decisionReason || "").trim();
  if (finalPath !== alignment.suggestedPath && !decisionReason) return res.status(400).json({ success: false, message: "در صورت تغییر پیشنهاد سامانه، ثبت دلیل الزامی است." });
  alignment.finalPath = finalPath;
  alignment.decisionReason = decisionReason || undefined;
  alignment.decisionById = actor.id;
  alignment.decisionByRole = actor.role;
  alignment.decidedAt = new Date().toISOString();
  db.data.auditLogs.push({ id: uuidv4(), entityType: "Case", entityId: child.id, action: "STATUS_CHANGE", userId: actor.id, timestamp: alignment.decidedAt, oldValue: alignment.suggestedPath, newValue: finalPath, reason: alignment.decisionReason, details: "تصمیم نهایی متخصص برای نتیجه همسویی ثبت شد." });
  db.persist();
  res.json({ success: true, alignment });
});

// Get assessments for a specific child (for ChildProfile tabs)
assessmentsRouter.get("/child/:childId", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده نتیجه وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "مربی فقط مجاز به تکمیل فرم ارزیابی است و به نتایج دسترسی ندارد." });
  const { childId } = req.params;
  const child = db.data.children.find(item => item.id === childId);
  if (!child) return res.status(404).json({ success: false, message: "پرونده کودک پیدا نشد." });
  if (!canViewChildRecord(viewer, child)) return res.status(403).json({ success: false, message: "شما به اطلاعات این کودک دسترسی ندارید." });
  
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
  const child = db.data.children.find(item => item.id === childId);
  if (!child) return res.status(404).json({ success: false, message: "پرونده کودک پیدا نشد." });
  if (!canViewChildRecord(viewer, child)) return res.status(403).json({ success: false, message: "شما به اطلاعات این کودک دسترسی ندارید." });
  
  const events: Array<{ date: string; type: string; title: string; details?: string }> = [];

  // Child creation
  events.push({ date: child.createdAt, type: "child", title: "ثبت پرونده کودک" });

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
      details: `مسیر پیشنهادی: ${a.suggestedPath}${a.finalPath ? ` | تصمیم نهایی: ${a.finalPath}${a.decisionReason ? ` | دلیل: ${a.decisionReason}` : ""}` : ""}`
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
