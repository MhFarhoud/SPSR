import express from "express";
import { childService } from "../services/ChildService";
import { importExportService } from "../services/ImportExportService";
import multer from "multer";
import { childRepository } from "../repositories/ChildRepository";
import { db } from "../db";
import { withEffectiveCaseStatus } from "../services/ChildClassification";
import { v4 as uuidv4 } from "uuid";

const upload = multer({ storage: multer.memoryStorage() });
export const childrenRouter = express.Router();

childrenRouter.get("/", (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const search = req.query.search as string | undefined;
  const userId = req.query.userId as string | undefined;
  const archive = req.query.archive === "true";
  const status = req.query.status as string | undefined;

  const result = childService.listChildren(page, pageSize, search, userId, archive, status);
  res.json({ success: true, ...result });
});

childrenRouter.get("/:id", (req, res) => {
  const child = childService.getChild(req.params.id);
  if (child) {
    res.json({ success: true, child: withEffectiveCaseStatus(child, db.data.alignments) });
  } else {
    res.status(404).json({ success: false, message: "کودک یافت نشد" });
  }
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
  res.json({ success: true, child: withEffectiveCaseStatus(child, db.data.alignments) });
});

childrenRouter.post("/", (req, res) => {
  try {
    const child = childService.registerChild(req.body);
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
