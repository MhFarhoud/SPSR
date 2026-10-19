import express from "express";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";
import type { ActionItem } from "../../types";
import { getSessionUser } from "../auth";
import { canViewChildRecord } from "../access";

export const actionsRouter = express.Router();

// GET all actions
actionsRouter.get("/", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده اقدامات وارد سامانه شوید." });
  let actions = db.data.actionItems || [];
  if (viewer.role === "مربی") actions = actions.filter(item => item.responsiblePersonId === viewer.id);
  else if (["سرمربی", "سوپروایزر"].includes(viewer.role)) {
    const visibleChildIds = new Set(db.data.children.filter(child => canViewChildRecord(viewer, child)).map(child => child.id));
    actions = actions.filter(item => visibleChildIds.has(item.childId));
  }
  res.json({ success: true, actionItems: actions });
});

// POST new action
actionsRouter.post("/", (req, res) => {
  const actor = getSessionUser(req);
  if (!actor) return res.status(401).json({ success: false, message: "برای ارجاع وظیفه وارد سامانه شوید." });
  if (!["ادمین", "تیم_تخصصی", "سرمربی", "سوپروایزر"].includes(actor.role)) return res.status(403).json({ success: false, message: "نقش شما اجازه ارجاع وظیفه ندارد." });
  const child = db.data.children.find(item => item.id === req.body?.childId);
  if (!child || !canViewChildRecord(actor, child)) return res.status(403).json({ success: false, message: "کودک انتخاب‌شده در محدوده دسترسی شما نیست." });
  const assignee = db.data.users.find(item => item.id === req.body?.responsiblePersonId && item.isActive !== false);
  if (!assignee) return res.status(400).json({ success: false, message: "مسئول انجام وظیفه معتبر نیست." });
  if (["فرم فالوآپ", "فرم ارزیابی"].includes(req.body?.taskType) && assignee.role !== "مربی") return res.status(400).json({ success: false, message: "وظیفهٔ تکمیل فرم باید به مربی ارجاع شود." });
  if (req.body?.taskType && !["فرم ارزیابی", "فرم فالوآپ", "اجرای راهکار", "اقدام اجرایی", "پایش رفتار", "مشاهده مشخص"].includes(req.body.taskType)) return res.status(400).json({ success: false, message: "نوع وظیفه معتبر نیست." });
  if (!String(req.body?.action || "").trim() || !req.body?.dueDate) return res.status(400).json({ success: false, message: "شرح وظیفه و مهلت انجام الزامی است." });
  if (!db.data.actionItems) {
    db.data.actionItems = [];
  }
  
  const newAction: ActionItem = {
    ...req.body,
    id: uuidv4(),
    action: String(req.body.action).trim(),
    creatorId: actor.id,
    createdAt: new Date().toISOString(),
    status: req.body.status || "شروع_نشده"
  };
  
  db.data.actionItems.push(newAction);
  
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Case",
    entityId: newAction.childId,
    action: "CREATE",
    userId: actor.id,
    timestamp: new Date().toISOString(),
    details: `Action created: ${newAction.action}`
  });

  db.persist();
  res.json({ success: true, action: newAction });
});

// PUT update action status
actionsRouter.put("/:id", (req, res) => {
  const actor = getSessionUser(req);
  if (!actor) return res.status(401).json({ success: false, message: "برای به‌روزرسانی وظیفه وارد سامانه شوید." });
  const actionId = req.params.id;
  const actionIndex = db.data.actionItems.findIndex(a => a.id === actionId);
  
  if (actionIndex > -1) {
    const current = db.data.actionItems[actionIndex];
    const child = db.data.children.find(item => item.id === current.childId);
    const mayManage = ["ادمین", "تیم_تخصصی", "سرمربی", "سوپروایزر"].includes(actor.role) && Boolean(child && canViewChildRecord(actor, child));
    const mayUpdateOwnTask = actor.id === current.responsiblePersonId;
    if (!mayManage && !mayUpdateOwnTask) return res.status(403).json({ success: false, message: "اجازه ویرایش این وظیفه را ندارید." });
    const updates = req.body || {};
    if (!mayManage && Object.keys(updates).some(key => !["status", "resultNotes", "startedAt", "completedAt", "nextFollowUpDate"].includes(key))) {
      return res.status(403).json({ success: false, message: "فقط وضعیت و نتیجه وظیفه خود را می‌توانید ثبت کنید." });
    }
    const now = new Date().toISOString();
    const nextStatus = updates.status || current.status;
    if (!["شروع_نشده", "در_حال_انجام", "انجام_شده", "متوقف_شده", "لغوشده", "نیازمند_بازبینی"].includes(nextStatus)) return res.status(400).json({ success: false, message: "وضعیت انتخاب‌شده معتبر نیست." });
    db.data.actionItems[actionIndex] = {
      ...current,
      ...(mayManage ? updates : {}),
      ...(!mayManage ? Object.fromEntries(Object.entries(updates).filter(([key]) => ["status", "resultNotes", "startedAt", "completedAt", "nextFollowUpDate"].includes(key))) : {}),
      status: nextStatus,
      startedAt: nextStatus === "در_حال_انجام" ? current.startedAt || updates.startedAt || now : current.startedAt,
      completedAt: nextStatus === "انجام_شده" ? current.completedAt || updates.completedAt || now : (nextStatus === "شروع_نشده" ? undefined : current.completedAt)
    };
    db.data.auditLogs.push({
      id: uuidv4(), entityType: "Case", entityId: current.childId, action: "UPDATE", userId: actor.id, timestamp: now,
      oldValue: current.status, newValue: nextStatus, details: `وضعیت وظیفه «${current.action}» تغییر کرد.`
    });
    
    db.persist();
    res.json({ success: true, action: db.data.actionItems[actionIndex] });
  } else {
    res.status(404).json({ success: false, message: "اقدام یافت نشد" });
  }
});
