import express from "express";
import { childService } from "../services/ChildService";
import { importExportService } from "../services/ImportExportService";
import multer from "multer";
import { childRepository } from "../repositories/ChildRepository";
import { db } from "../db";
import { withEffectiveCaseStatus } from "../services/ChildClassification";
import { getSessionUser } from "../auth";
import { canViewChildRecord } from "../access";
import { v4 as uuidv4 } from "uuid";

const upload = multer({ storage: multer.memoryStorage() });
export const childrenRouter = express.Router();

childrenRouter.get("/", (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const search = req.query.search as string | undefined;
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده پرونده‌ها وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "مربی به فهرست پرونده‌ها دسترسی ندارد؛ برای ثبت فرم از بخش ارزیابی‌های من اقدام کنید." });
  const archive = req.query.archive === "true";
  const status = req.query.status as string | undefined;

  const result = childService.listChildren(page, pageSize, search, viewer.id, archive, status);
  res.json({ success: true, ...result });
});

childrenRouter.get("/:id", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده پرونده وارد سامانه شوید." });
  const child = childService.getChild(req.params.id);
  if (child && !canViewChildRecord(viewer, child)) {
    return res.status(403).json({ success: false, message: "شما به پرونده این کودک دسترسی ندارید." });
  }
  if (child) {
    res.json({ success: true, child: withEffectiveCaseStatus(child, db.data.alignments, [...db.data.teacherAssessments, ...db.data.parentAssessments], db.data.followUps) });
  } else {
    res.status(404).json({ success: false, message: "کودک یافت نشد" });
  }
});

const CHILD_EDIT_ROLES = ["ادمین", "تیم_تخصصی", "سرمربی"];

childrenRouter.patch("/:id", (req, res) => {
  const actor = db.data.users.find(user => user.id === req.body?.userId);
  if (!actor || !CHILD_EDIT_ROLES.includes(actor.role)) {
    return res.status(403).json({ success: false, message: "ویرایش پرونده فقط برای سرمربی، تیم تخصصی و ادمین مجاز است." });
  }
  const child = childRepository.findById(req.params.id);
  if (!child) return res.status(404).json({ success: false, message: "پرونده کودک پیدا نشد." });

  const { firstName, lastName, nationalId, birthDate, gender, parentName, parentContactPhone, centerId, classId, stage } = req.body || {};
  const center = db.data.centers.find(item => item.id === centerId);
  if (!center) return res.status(400).json({ success: false, message: "مرکز انتخاب‌شده معتبر نیست." });
  if (actor.role === "سرمربی" && (!(actor.centerIds || []).includes(centerId) || !(actor.centerIds || []).includes(child.currentCenterId))) {
    return res.status(403).json({ success: false, message: "شما فقط می‌توانید کودکان مراکز تحت پوشش خود را تخصیص دهید." });
  }
  const validStages = ["مهد", "پیش‌دبستانی۱", "پیش‌دبستانی۲"];
  if (!validStages.includes(stage)) return res.status(400).json({ success: false, message: "مقطع انتخاب‌شده معتبر نیست." });
  const selectedClass = classId ? db.data.classes?.find(item => item.id === classId && item.centerId === centerId) : undefined;
  if (classId && !selectedClass) return res.status(400).json({ success: false, message: "کلاس انتخاب‌شده به این مرکز تعلق ندارد." });
  if (actor.role === "سرمربی" && selectedClass?.supervisorId !== actor.id) return res.status(403).json({ success: false, message: "شما فقط می‌توانید کودک را به کلاس‌های تحت سرپرستی خود اختصاص دهید." });

  if (!String(firstName || "").trim() || !String(lastName || "").trim() || !String(birthDate || "").trim() || !String(parentContactPhone || "").trim() || !["پسر", "دختر"].includes(gender)) {
    return res.status(400).json({ success: false, message: "نام، نام خانوادگی، تاریخ تولد، جنسیت و تلفن والد الزامی است." });
  }

  const previousAssignmentChanged = child.currentCenterId !== centerId || child.currentClassId !== (classId || undefined) || child.currentStage !== stage;
  const oldValues = `${child.currentCenterId}/${child.currentClassId || "بدون کلاس"}/${child.currentStage}`;
  Object.assign(child, {
    firstName: String(firstName || "").trim(), lastName: String(lastName || "").trim(),
    nationalId: String(nationalId || "").trim(), birthDate: String(birthDate || "").trim(),
    gender, parentName: String(parentName || "").trim(), parentContactPhone: String(parentContactPhone || "").trim(),
    currentCenterId: centerId, currentClassId: classId || undefined, currentStage: stage,
    updatedAt: new Date().toISOString()
  });
  if (previousAssignmentChanged) {
    db.data.enrollments ||= [];
    const now = new Date().toISOString();
    db.data.enrollments.filter(item => item.childId === child.id && !item.toDate).forEach(item => { item.toDate = now; });
    db.data.enrollments.push({ id: uuidv4(), childId: child.id, centerId, classId: classId || undefined, stage, fromDate: now, toDate: null });
    db.data.auditLogs.push({ id: uuidv4(), entityType: "Child", entityId: child.id, action: "UPDATE", userId: actor.id, timestamp: now, oldValue: oldValues, newValue: `${centerId}/${classId || "بدون کلاس"}/${stage}`, details: "اطلاعات و تخصیص آموزشی پرونده ویرایش شد." });
  } else {
    db.data.auditLogs.push({ id: uuidv4(), entityType: "Child", entityId: child.id, action: "UPDATE", userId: actor.id, timestamp: new Date().toISOString(), details: "اطلاعات پایه پرونده ویرایش شد." });
  }
  childRepository.save(child);
  db.persist();
  res.json({ success: true, child: withEffectiveCaseStatus(child, db.data.alignments, [...db.data.teacherAssessments, ...db.data.parentAssessments], db.data.followUps) });
});

childrenRouter.patch("/:id/archive", (req, res) => {
  const actor = db.data.users.find(user => user.id === req.body?.userId);
  if (!actor || !["ادمین", "تیم_تخصصی"].includes(actor.role)) {
    return res.status(403).json({ success: false, message: "فقط ادمین یا تیم تخصصی می‌تواند پرونده را بایگانی کند." });
  }
  const child = childRepository.findById(req.params.id);
  if (!child) return res.status(404).json({ success: false, message: "پرونده کودک پیدا نشد." });
  const archived = req.body?.archived;
  if (typeof archived !== "boolean") return res.status(400).json({ success: false, message: "وضعیت بایگانی نامعتبر است." });

  child.archived = archived;
  child.activeStatus = archived ? "آرشیوشده" : "فعال";
  child.updatedAt = new Date().toISOString();
  childRepository.save(child);
  db.data.auditLogs.push({
    id: uuidv4(), entityType: "Child", entityId: child.id,
    action: archived ? "ARCHIVE" : "UPDATE", userId: actor.id,
    timestamp: new Date().toISOString(), details: archived ? "پرونده بایگانی شد" : "پرونده از بایگانی خارج شد"
  });
  db.persist();
  res.json({ success: true, child: withEffectiveCaseStatus(child, db.data.alignments, [...db.data.teacherAssessments, ...db.data.parentAssessments], db.data.followUps) });
});

childrenRouter.post("/", (req, res) => {
  try {
    const actor = db.data.users.find(user => user.id === req.body?.createdBy);
    if (!actor || !CHILD_EDIT_ROLES.includes(actor.role)) {
      return res.status(403).json({ success: false, message: "ثبت کودک فقط برای سرمربی، تیم تخصصی و ادمین مجاز است." });
    }
    if (actor.role === "سرمربی" && !(actor.centerIds || []).includes(req.body.currentCenterId)) {
      return res.status(403).json({ success: false, message: "شما فقط می‌توانید کودک را به مراکز تحت پوشش خود اختصاص دهید." });
    }
    const center = db.data.centers.find(item => item.id === req.body.currentCenterId);
    if (!center) return res.status(400).json({ success: false, message: "انتخاب مرکز الزامی است." });
    if (!["مهد", "پیش‌دبستانی۱", "پیش‌دبستانی۲"].includes(req.body.currentStage)) return res.status(400).json({ success: false, message: "انتخاب مقطع الزامی است." });
    const selectedClass = req.body.currentClassId ? db.data.classes?.find(item => item.id === req.body.currentClassId && item.centerId === req.body.currentCenterId) : undefined;
    if (req.body.currentClassId && !selectedClass) return res.status(400).json({ success: false, message: "کلاس انتخاب‌شده به این مرکز تعلق ندارد." });
    if (actor.role === "سرمربی" && selectedClass?.supervisorId !== actor.id) return res.status(403).json({ success: false, message: "شما فقط می‌توانید کودک را به کلاس‌های تحت سرپرستی خود اختصاص دهید." });
    const child = childService.registerChild(req.body);
    db.data.enrollments ||= [];
    db.data.enrollments.push({ id: uuidv4(), childId: child.id, centerId: child.currentCenterId, classId: child.currentClassId, stage: child.currentStage, fromDate: child.createdAt, toDate: null });
    db.data.auditLogs.push({ id: uuidv4(), entityType: "Child", entityId: child.id, action: "CREATE", userId: actor.id, timestamp: new Date().toISOString(), details: "پرونده کودک ایجاد شد." });
    db.persist();
    res.json({ success: true, child });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

childrenRouter.post("/import-preview", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "فایلی ارسال نشده است" });
  }
  
  try {
    const preview = importExportService.parseAndValidateChildrenExcel(req.file.buffer);
    res.json({ success: true, preview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "خطا در پردازش فایل اکسل: " + error.message });
  }
});

childrenRouter.post("/import-commit", (req, res) => {
  const { validRows } = req.body;
  if (!validRows || !Array.isArray(validRows)) {
    return res.status(400).json({ success: false, message: "داده‌های معتبر ارسال نشده است" });
  }
  
  try {
    const committed = importExportService.commitImport(validRows);
    res.json({ success: true, committed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "خطا در ثبت اطلاعات: " + error.message });
  }
});
