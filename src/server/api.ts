import express from "express";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { userRepository } from "./repositories/UserRepository";
import { childrenRouter } from "./routes/children";
import { dashboardRouter } from "./routes/dashboard";
import { assessmentsRouter } from "./routes/assessments";
import { db } from "./db";
import { clearSession, createSession, getSessionUser, setSessionCookie } from "./auth";
import { withEffectiveCaseStatus } from "./services/ChildClassification";

export const apiRouter = express.Router();

// ── Authentication ──
apiRouter.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  const user = userRepository.findByPhone(phone);
  
  if (user) {
    let isMatch = false;
    
    if (user.password === "4411") {
      isMatch = password === "4411";
      if (isMatch) {
        user.password = await bcrypt.hash(password, 10);
        userRepository.save(user);
      }
    } else if (user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }
    
    if (isMatch) {
      const { password: _, ...userWithoutPassword } = user;
      setSessionCookie(res, createSession(user.id));
      return res.json({ success: true, user: userWithoutPassword });
    }
  }
  
  res.status(401).json({ success: false, message: "شماره تماس یا رمز عبور اشتباه است" });
});

apiRouter.get("/session", (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ success: false });
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

apiRouter.post("/logout", (req, res) => {
  clearSession(req, res);
  res.json({ success: true });
});

// ── Public Routes (Parents) ──
apiRouter.post("/public/verify-parent", (req, res) => {
  const { childId, nationalId } = req.body;
  if (!childId || !nationalId) {
    return res.status(400).json({ success: false, message: "کد کودک و کد ملی الزامی است" });
  }

  const child = db.data.children.find(c => c.childId === childId);
  if (!child) {
    return res.status(404).json({ success: false, message: "کودک یافت نشد" });
  }

  // Verify National ID
  if (child.nationalId !== nationalId) {
    return res.status(401).json({ success: false, message: "کد ملی نامعتبر است" });
  }

  res.json({ success: true, child });
});

// ── User Management ──
apiRouter.get("/permissions", (_req, res) => {
  res.json({ permissions: db.data.permissions || {} });
});

apiRouter.put("/permissions", (req, res) => {
  if (!req.body?.permissions || typeof req.body.permissions !== "object") {
    return res.status(400).json({ success: false, message: "تنظیمات دسترسی نامعتبر است" });
  }
  db.data.permissions = req.body.permissions;
  db.persist();
  res.json({ success: true, permissions: db.data.permissions });
});

apiRouter.post("/users", async (req, res) => {
  const plainPassword = req.body.password || "4411";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const newUser = {
    id: `u${Date.now()}`,
    fullName: req.body.fullName,
    phone: req.body.phone,
    role: req.body.role,
    centerIds: req.body.centerIds || [],
    password: hashedPassword
  };
  
  userRepository.save(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ success: true, user: userWithoutPassword });
});

apiRouter.put("/users/:id", (req, res) => {
  const user = userRepository.findById(req.params.id);
  if (user) {
    if (req.body.fullName) user.fullName = req.body.fullName;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.role) user.role = req.body.role;
    if (req.body.centerIds) user.centerIds = req.body.centerIds;
    
    userRepository.save(user);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(404).json({ success: false, message: "کاربر یافت نشد" });
  }
});

apiRouter.put("/users/:id/password", async (req, res) => {
  const user = userRepository.findById(req.params.id);
  if (user) {
    user.password = await bcrypt.hash(req.body.password, 10);
    userRepository.save(user);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "کاربر یافت نشد" });
  }
});

// ── Mount Module Routers ──
apiRouter.use("/children", childrenRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/assessments", assessmentsRouter);

// Legacy form submission routes (redirect to new router for backwards compatibility)
apiRouter.post("/forms/teacher", (req, res, next) => {
  req.url = "/teacher";
  assessmentsRouter(req, res, next);
});
apiRouter.post("/forms/parent", (req, res, next) => {
  req.url = "/parent";
  assessmentsRouter(req, res, next);
});
apiRouter.post("/followups", (req, res, next) => {
  req.url = "/followup";
  assessmentsRouter(req, res, next);
});

// Legacy child creation route (used by old TeacherForm/ParentForm)
apiRouter.post("/children-legacy", (req, res) => {
  const child = req.body;
  const idx = db.data.children.findIndex((c: any) => c.id === child.id);
  if (idx >= 0) db.data.children[idx] = child;
  else db.data.children.push(child);
  db.persist();
  res.json({ success: true, child });
});

// ── Full Data Endpoint (temporary, for old pages) ──
apiRouter.get("/data", (req, res) => {
  const data = db.data;
  const viewer = getSessionUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: "برای دریافت اطلاعات وارد سامانه شوید." });
  const isCoach = viewer?.role === "مربی";
  const coachClasses = isCoach ? data.classes.filter(group => group.teacherId === viewer.id) : data.classes;
  const coachClassIds = new Set(coachClasses.map(group => group.id));
  const coachChildren = isCoach ? data.children.filter(child => child.currentClassId && coachClassIds.has(child.currentClassId)) : data.children;
  const assessments = [...data.teacherAssessments, ...data.parentAssessments];
  const children = coachChildren.map(child => withEffectiveCaseStatus(child, data.alignments, assessments));
  const coachSafeChildren = isCoach ? children.map(child => {
    const { caseStatus, priority, statusChangeReason, statusChangeDate, ...safeChild } = child;
    return safeChild;
  }) : children;
  const visibleUserIds = new Set(isCoach ? [viewer.id] : data.users.map(user => user.id));
  const visibleChildIds = new Set(coachChildren.map(child => child.id));
  const safeData = {
    ...data,
    centers: isCoach ? data.centers.filter(center => viewer.centerIds.includes(center.id)) : data.centers,
    classes: coachClasses,
    children: coachSafeChildren,
    ...(isCoach ? {
      teacherAssessments: data.teacherAssessments
        .filter(assessment => assessment.teacherId === viewer.id && visibleChildIds.has(assessment.childId))
        .map(assessment => {
          const { score, ...ownFormWithoutResult } = assessment;
          return ownFormWithoutResult;
        }),
      parentAssessments: [],
      alignments: [],
      followUps: [],
      followUpComparisons: [],
      referralDecisions: [],
      enrollments: data.enrollments.filter(enrollment => visibleChildIds.has(enrollment.childId)),
      actionItems: data.actionItems.filter(action => action.responsiblePersonId === viewer.id),
      auditLogs: [],
      formVersions: [],
      permissions: {}
    } : {}),
    users: data.users.filter(user => visibleUserIds.has(user.id)).map((u: any) => {
      const { password, ...safeUser } = u;
      return safeUser;
    })
  };
  res.json(safeData);
});

apiRouter.post("/data/reset", async (req, res) => {
  const actor = userRepository.findById(req.body?.userId);
  if (!actor || actor.role !== "ادمین") {
    return res.status(403).json({ success: false, message: "فقط مدیر سیستم می‌تواند داده‌ها را ریست کند." });
  }
  const passwordMatches = actor.password === "4411"
    ? req.body?.password === "4411"
    : Boolean(actor.password && await bcrypt.compare(req.body?.password || "", actor.password));
  if (!passwordMatches) {
    return res.status(401).json({ success: false, message: "رمز عبور مدیر سیستم صحیح نیست." });
  }
  if (req.body?.confirmation !== "ریست کامل") {
    return res.status(400).json({ success: false, message: "تأیید ریست کامل الزامی است." });
  }

  const backupDirectory = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDirectory, { recursive: true });
  const backupName = `data-before-reset-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(path.join(backupDirectory, backupName), JSON.stringify(db.data, null, 2));

  db.data = {
    users: db.data.users.filter(user => user.role === "ادمین"),
    centers: [], classes: [], children: [], enrollments: [],
    teacherAssessments: [], parentAssessments: [], alignments: [],
    referralDecisions: [], followUps: [], followUpComparisons: [],
    actionItems: [], auditLogs: [], formVersions: [], permissions: {}
  };
  db.persist();
  res.json({ success: true, backupName, message: "داده‌ها ریست شدند؛ حساب‌های مدیر سیستم حفظ شدند." });
});
