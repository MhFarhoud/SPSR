import express from "express";
import { childRepository } from "../repositories/ChildRepository";
import { db } from "../db";

export const dashboardRouter = express.Router();

dashboardRouter.get("/stats", (req, res) => {
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
