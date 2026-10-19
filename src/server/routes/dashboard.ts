import express from "express";
import { childRepository } from "../repositories/ChildRepository";
import { db } from "../db";
import { getSessionUser } from "../auth";
import { getActiveChildren, hasActiveFollowUp } from "../../domain/caseLifecycle";

export const dashboardRouter = express.Router();

dashboardRouter.get("/stats", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده داشبورد وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "آمار ارزیابی برای نقش مربی در دسترس نیست." });
  const allChildren = childRepository.findAll();
  const children = ["سرمربی", "سوپروایزر"].includes(viewer.role)
    ? allChildren.filter(child => (viewer.centerIds || []).includes(child.currentCenterId))
    : allChildren;
  const activeChildrenList = getActiveChildren(children);
  const childIds = new Set(activeChildrenList.map(child => child.id));
  
  const totalChildren = activeChildrenList.length;
  const activeChildren = activeChildrenList.length;
  
  const tAssessments = db.data.teacherAssessments.filter(form => childIds.has(form.childId)).length;
  const pAssessments = db.data.parentAssessments.filter(form => childIds.has(form.childId)).length;

  const totalFollowUps = db.data.followUps.filter(form => childIds.has(form.childId)).length;
  const activeFollowUps = activeChildrenList.filter(child => hasActiveFollowUp(child.id, db.data.followUps, db.data.actionItems)).length;

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
