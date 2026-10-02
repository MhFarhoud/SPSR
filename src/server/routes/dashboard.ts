import express from "express";
import { childRepository } from "../repositories/ChildRepository";
import { db } from "../db";
import { getSessionUser } from "../auth";

export const dashboardRouter = express.Router();

dashboardRouter.get("/stats", (req, res) => {
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای مشاهده داشبورد وارد سامانه شوید." });
  if (viewer.role === "مربی") return res.status(403).json({ success: false, message: "آمار ارزیابی برای نقش مربی در دسترس نیست." });
  const children = childRepository.findAll();
  
  const totalChildren = children.length;
  const activeChildren = children.filter(c => c.caseStatus !== "بسته_شده" && c.caseStatus !== "بایگانی").length;
  
  const tAssessments = db.data.teacherAssessments.length;
  const pAssessments = db.data.parentAssessments.length;
  
  const totalFollowUps = db.data.followUps.length;
  const activeFollowUps = db.data.followUps.filter(f => f.status !== "SUBMITTED" && f.status !== "LOCKED").length;

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
