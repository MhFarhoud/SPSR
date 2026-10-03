import express from "express";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";
import type { Center, ClassGroup, ChildEnrollment } from "../../types";
import { getSessionUser } from "../auth";

export const centersRouter = express.Router();

// GET all centers
centersRouter.get("/", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده مراکز وارد سامانه شوید." });
  const centers = ["سرمربی", "سوپروایزر"].includes(viewer.role)
    ? db.data.centers.filter(center => (viewer.centerIds || []).includes(center.id))
    : db.data.centers;
  res.json({ success: true, centers });
});

// POST new center
centersRouter.post("/", (req, res) => {
  const newCenter: Center = {
    ...req.body,
    id: uuidv4(),
    isActive: true,
  };
  
  db.data.centers.push(newCenter);
  
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Center",
    entityId: newCenter.id,
    action: "CREATE",
    userId: req.body.createdBy || "system", // Passed from client ideally
    timestamp: new Date().toISOString(),
    details: `Center ${newCenter.name} created`
  });

  db.persist();
  res.json({ success: true, center: newCenter });
});

// GET all classes
centersRouter.get("/classes", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده کلاس‌ها وارد سامانه شوید." });
  const classes = ["سرمربی", "سوپروایزر"].includes(viewer.role)
    ? (db.data.classes || []).filter(group => (viewer.centerIds || []).includes(group.centerId))
    : (db.data.classes || []);
  res.json({ success: true, classes });
});

// POST new class
centersRouter.post("/classes", (req, res) => {
  const { name, centerId, supervisorId, teacherId } = req.body || {};
  if (!name?.trim() || !centerId || !supervisorId) {
    return res.status(400).json({ success: false, message: "نام کلاس، مرکز و سرمربی الزامی است." });
  }
  const center = db.data.centers.find(item => item.id === centerId);
  if (!center) return res.status(404).json({ success: false, message: "مرکز انتخاب‌شده پیدا نشد." });
  const supervisor = db.data.users.find(item => item.id === supervisorId && item.role === "سرمربی");
  if (!supervisor) return res.status(400).json({ success: false, message: "سرمربی انتخاب‌شده معتبر نیست." });
  if (!(supervisor.centerIds || []).includes(centerId)) {
    return res.status(400).json({ success: false, message: "ابتدا این مرکز را در مدیریت کاربران به سرمربی اختصاص دهید." });
  }
  if (teacherId) {
    const teacher = db.data.users.find(item => item.id === teacherId && item.role === "مربی");
    if (!teacher) return res.status(400).json({ success: false, message: "مربی انتخاب‌شده معتبر نیست." });
    if (!(teacher.centerIds || []).includes(centerId)) {
      return res.status(400).json({ success: false, message: "ابتدا این مرکز را در مدیریت کاربران به مربی اختصاص دهید." });
    }
  }

  if (!db.data.classes) {
    db.data.classes = [];
  }
  
  const newClass: ClassGroup = {
    ...req.body,
    name: name.trim(),
    teacherId: teacherId || "",
    id: uuidv4(),
  };
  
  db.data.classes.push(newClass);
  
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "System",
    entityId: newClass.id,
    action: "CREATE",
    userId: req.body.createdBy || "system",
    timestamp: new Date().toISOString(),
    details: `Class ${newClass.name} created for center ${newClass.centerId}`
  });

  db.persist();
  res.json({ success: true, class: newClass });
});

// PUT update center
centersRouter.put("/:id", (req, res) => {
  const centerIndex = db.data.centers.findIndex(c => c.id === req.params.id);
  if (centerIndex === -1) return res.status(404).json({ success: false, message: "مرکز یافت نشد" });

  db.data.centers[centerIndex] = { ...db.data.centers[centerIndex], ...req.body };
  db.persist();
  res.json({ success: true, center: db.data.centers[centerIndex] });
});

// PUT update class
centersRouter.put("/classes/:id", (req, res) => {
  if (!db.data.classes) db.data.classes = [];
  const classIndex = db.data.classes.findIndex(c => c.id === req.params.id);
  if (classIndex === -1) return res.status(404).json({ success: false, message: "کلاس یافت نشد" });

  db.data.classes[classIndex] = { ...db.data.classes[classIndex], ...req.body };
  db.persist();
  res.json({ success: true, class: db.data.classes[classIndex] });
});

// GET all enrollments
centersRouter.get("/enrollments", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده تخصیص‌ها وارد سامانه شوید." });
  const enrollments = ["سرمربی", "سوپروایزر"].includes(viewer.role)
    ? (db.data.enrollments || []).filter(item => (viewer.centerIds || []).includes(item.centerId))
    : (db.data.enrollments || []);
  res.json({ success: true, enrollments });
});

// POST new enrollment (Assignment)
centersRouter.post("/enrollments", (req, res) => {
  const actor = db.data.users.find(user => user.id === req.body?.createdBy);
  if (!actor || !["ادمین", "تیم_تخصصی", "سرمربی"].includes(actor.role)) {
    return res.status(403).json({ success: false, message: "تخصیص کودک فقط برای سرمربی، تیم تخصصی و ادمین مجاز است." });
  }
  const child = db.data.children.find(item => item.id === req.body?.childId);
  const center = db.data.centers.find(item => item.id === req.body?.centerId);
  if (!child || !center) return res.status(400).json({ success: false, message: "کودک و مرکز معتبر انتخاب کنید." });
  if (actor.role === "سرمربی" && (!(actor.centerIds || []).includes(center.id) || !(actor.centerIds || []).includes(child.currentCenterId))) {
    return res.status(403).json({ success: false, message: "شما فقط به کودکان و مراکز تحت پوشش خود دسترسی دارید." });
  }
  const selectedClass = req.body?.classId ? db.data.classes?.find(item => item.id === req.body.classId && item.centerId === center.id) : undefined;
  if (req.body?.classId && !selectedClass) return res.status(400).json({ success: false, message: "کلاس انتخاب‌شده به مرکز انتخابی تعلق ندارد." });
  if (actor.role === "سرمربی" && selectedClass?.supervisorId !== actor.id) return res.status(403).json({ success: false, message: "فقط کلاس‌های تحت سرپرستی خود را می‌توانید انتخاب کنید." });
  if (!["مهد", "پیش‌دبستانی۱", "پیش‌دبستانی۲"].includes(req.body?.stage)) return res.status(400).json({ success: false, message: "مقطع انتخاب‌شده معتبر نیست." });
  if (!db.data.enrollments) {
    db.data.enrollments = [];
  }
  const now = new Date().toISOString();
  db.data.enrollments.filter(item => item.childId === child.id && !item.toDate).forEach(item => { item.toDate = now; });
  const newEnrollment: ChildEnrollment = {
    ...req.body,
    id: uuidv4(),
    fromDate: req.body.fromDate || now,
    toDate: null,
  };
  
  db.data.enrollments.push(newEnrollment);
  
  // Update child's current center/class
  child.currentCenterId = newEnrollment.centerId;
  child.currentClassId = newEnrollment.classId;
  child.currentStage = newEnrollment.stage;
  child.updatedAt = now;
  
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Child",
    entityId: newEnrollment.childId,
    action: "UPDATE",
    userId: actor.id,
    timestamp: now,
    details: `Child assigned to center ${newEnrollment.centerId} and class ${newEnrollment.classId}`
  });

  db.persist();
  res.json({ success: true, enrollment: newEnrollment });
});
