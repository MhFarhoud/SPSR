import express from "express";
import { childRepository } from "../repositories/ChildRepository";
import { db } from "../db";
import { getSessionUser } from "../auth";

export const dashboardRouter = express.Router();

dashboardRouter.get("/stats", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده داشبورد وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "آمار ارزیابی برای نقش مربی در دسترس نیست." });
  const allChildren = childRepository.findAll();
  const children = ["سرمربی", "سوپروایزر"].includes(viewer.role)
    ? allChildren.filter(child => (viewer.centerIds || []).includes(child.currentCenterId))
    : allChildren;
  const childIds = new Set(children.map(child => child.id));
  
  const totalChildren = children.length;
  const activeChildren = children.filter(c => c.caseStatus !== "بسته_شده" && c.caseStatus !== "بایگانی").length;
  
  const tAssessments = db.data.teacherAssessments.filter(form => childIds.has(form.childId)).length;
  const pAssessments = db.data.parentAssessments.filter(form => childIds.has(form.childId)).length;

  const totalFollowUps = db.data.followUps.filter(form => childIds.has(form.childId)).length;
  const activeFollowUps = db.data.followUps.filter(f => childIds.has(f.childId) && f.status !== "SUBMITTED" && f.status !== "LOCKED").length;

  res.json({
    success: true,
    stats: {
      totalChildren,
      activeChildren,
      totalAssessments: tAssessments + pAssessments,
      totalFollowUps,
      activeFollowUps
    }
  });
});
