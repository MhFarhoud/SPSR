import express from "express";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";
import type { ActionItem } from "../../types";

export const actionsRouter = express.Router();

// GET all actions
actionsRouter.get("/", (req, res) => {
  res.json({ success: true, actionItems: db.data.actionItems || [] });
});

// POST new action
actionsRouter.post("/", (req, res) => {
  if (!db.data.actionItems) {
    db.data.actionItems = [];
  }
  
  const newAction: ActionItem = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    status: req.body.status || "شروع_نشده"
  };
  
  db.data.actionItems.push(newAction);
  
  db.data.auditLogs.push({
    id: uuidv4(),
    entityType: "Case",
    entityId: newAction.childId,
    action: "CREATE",
    userId: req.body.creatorId || "system", 
    timestamp: new Date().toISOString(),
    details: `Action created: ${newAction.action}`
  });

  db.persist();
  res.json({ success: true, action: newAction });
});

// PUT update action status
actionsRouter.put("/:id", (req, res) => {
  const actionId = req.params.id;
  const actionIndex = db.data.actionItems.findIndex(a => a.id === actionId);
  
  if (actionIndex > -1) {
    db.data.actionItems[actionIndex] = {
      ...db.data.actionItems[actionIndex],
      ...req.body
    };
    
    db.persist();
    res.json({ success: true, action: db.data.actionItems[actionIndex] });
  } else {
    res.status(404).json({ success: false, message: "اقدام یافت نشد" });
  }
});
