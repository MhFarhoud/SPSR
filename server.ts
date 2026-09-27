import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { childrenRouter } from "./src/server/routes/children";
import { assessmentsRouter } from "./src/server/routes/assessments";
import { dashboardRouter } from "./src/server/routes/dashboard";
import { centersRouter } from "./src/server/routes/centers";
import { actionsRouter } from "./src/server/routes/actions";

const app = express();
const PORT = 5173;
const DATA_FILE = path.join(process.cwd(), "data.json");

app.use(express.json());

// Initialize default data if not exists
const defaultData = {
  users: [
    { id: "u0", fullName: "مدیر سیستم", phone: "09120000000", role: "ادمین", centerIds: [], password: "4411" },
    { id: "u1", fullName: "مریم احمدی", phone: "09120000001", role: "مربی", centerIds: ["c1"], password: "4411" },
    { id: "u2", fullName: "علی رضایی", phone: "09120000002", role: "سرمربی", centerIds: ["c1"], password: "4411" },
    { id: "u3", fullName: "زهرا کریمی", phone: "09120000003", role: "سوپروایزر", centerIds: ["c1", "c2"], password: "4411" },
    { id: "u4", fullName: "تیم تخصصی", phone: "09120000004", role: "تیم_تخصصی", centerIds: [], password: "4411" }
  ],
  centers: [
    { id: "c1", name: "مهد کودک شکوفه ۱", region: "منطقه ۱" },
    { id: "c2", name: "مهد کودک شکوفه ۲", region: "منطقه ۲" }
  ],
  children: [
    {
      id: "ch1",
      firstName: "امیرعلی",
      lastName: "محمدی",
      birthDate: "1398/05/12",
      gender: "پسر",
      parentContactPhone: "09123334455",
      currentCenterId: "c1",
      currentStage: "پیش‌دبستانی۱",
      stageHistory: [{ stage: "مهد", centerId: "c1", fromDate: "1401/07/01", toDate: "1402/06/31" }],
      currentLevel: null,
      flags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  teacherForms: [],
  parentForms: [],
  followUps: [],
  rules: {
    level4: { totalCutoff: 17, minDomainAbnormal: 1, distressHigh: true },
    level3: { totalCutoff: 17, minDomainAbnormal: 1 },
    level2: { totalCutoff: 14, minDomainBorderline: 2, distressHigh: false }
  }
};

import { apiRouter } from "./src/server/api";

// API Routes
app.use("/api", apiRouter);
app.use("/api/children", childrenRouter);
app.use("/api/assessments", assessmentsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/centers", centersRouter);
app.use("/api/actions", actionsRouter);

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
