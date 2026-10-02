/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ChildrenList } from "./pages/ChildrenList";
import { ChildRegistration } from "./pages/ChildrenList/ChildRegistration";
import { ImportExcel } from "./pages/ChildrenList/ImportExcel";
import { ChildProfile } from "./pages/ChildProfile";
import { TeacherForm } from "./pages/TeacherForm";
import { ParentForm } from "./pages/ParentForm";
import { PublicParentForm } from "./pages/PublicParentForm";
import { FollowUpForm } from "./pages/FollowUpForm";
import { AssessmentsModule } from "./pages/Assessments";
import { CasesModule } from "./pages/Cases";
import { CentersModule } from "./pages/Centers";
import { ReportsModule } from "./pages/Reports";
import { ActionsList } from "./pages/ActionsList";
import { ReferralsList } from "./pages/ReferralsList";
import { ReferralDetails } from "./pages/ReferralDetails";
import { AdminPanel } from "./pages/AdminPanel";
import { DataManagement } from "./pages/DataManagement";
import type { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (window.location.pathname.startsWith("/p/")) {
      setCheckingSession(false);
      return;
    }
    if (!localStorage.getItem("auth_user")) {
      setCheckingSession(false);
      return;
    }
    fetch("/api/session")
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (result?.success && result.user) {
          setUser(result.user);
          localStorage.setItem("auth_user", JSON.stringify(result.user));
        } else {
          localStorage.removeItem("auth_user");
        }
      })
      .catch(() => localStorage.removeItem("auth_user"))
      .finally(() => setCheckingSession(false));
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem("auth_user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    void fetch("/api/logout", { method: "POST" }).catch(() => undefined);
  };

  const isPublicRoute = window.location.pathname.startsWith('/p/');

  if (checkingSession && !isPublicRoute) {
    return <div className="p-8 text-center text-gray-500">در حال بررسی نشست کاربری...</div>;
  }

  if (!user && !isPublicRoute) {
    return <Login onLogin={handleLogin} />;
  }

  if (isPublicRoute) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/p/:childId" element={<PublicParentForm />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Therapist gets a fully isolated view — only dashboard (which shows their panel) and referrals
  const isTherapist = user.role === "درمانگر";

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          
          {/* Children routes — not available to therapist */}
          {!isTherapist && (
            <>
              <Route path="/children" element={<ChildrenList user={user} />} />
              <Route path="/children/new" element={<ChildRegistration user={user} />} />
              <Route path="/children/import" element={<ImportExcel user={user} />} />
              <Route path="/child/:id" element={<ChildProfile user={user} />} />
              <Route path="/child/:id/form" element={<TeacherForm user={user} />} />
              {user.role !== "مربی" && <Route path="/child/:id/parent-form" element={<ParentForm user={user} />} />}
              {user.role !== "مربی" && <Route path="/child/:id/followup/new" element={<FollowUpForm user={user} />} />}
              <Route path="/children/*" element={<ChildrenList user={user} />} />
            </>
          )}
          
          {/* Case Management modules — not available to therapist */}
          {!isTherapist && (
            <>
              <Route path="/actions" element={<ActionsList user={user} />} />
              <Route path="/actions/*" element={<ActionsList user={user} />} />
            </>
          )}

          {/* Referrals — available to all except مربی (per PDF 27) */}
          {user.role !== "مربی" && (
            <>
              <Route path="/referrals" element={<ReferralsList user={user} />} />
              <Route path="/referrals/:id" element={<ReferralDetails user={user} />} />
              <Route path="/referrals/*" element={<ReferralsList user={user} />} />
            </>
          )}
          
          {/* Centers — not for مربی or درمانگر (per PDF) */}
          {!isTherapist && user.role !== "مربی" && (
            <>
              <Route path="/centers" element={<CentersModule user={user} />} />
              <Route path="/centers/*" element={<CentersModule user={user} />} />
            </>
          )}
          
          {/* Cases — not for therapist */}
          {!isTherapist && user.role !== "مربی" && (
            <>
              <Route path="/cases" element={<CasesModule user={user} />} />
              <Route path="/cases/*" element={<CasesModule user={user} />} />
            </>
          )}
          
          {/* Assessments — not for therapist */}
          {!isTherapist && (
            <>
              <Route path="/assessments/parent" element={user.role === "مربی" ? <Navigate to="/assessments/mine" replace /> : <AssessmentsModule user={user} />} />
              <Route path="/assessments" element={<AssessmentsModule user={user} />} />
              <Route path="/assessments/*" element={<AssessmentsModule user={user} />} />
            </>
          )}
          
          {/* Reports — not for therapist */}
          {!isTherapist && user.role !== "مربی" && (
            <>
              <Route path="/reports" element={<ReportsModule user={user} />} />
              <Route path="/reports/*" element={<ReportsModule user={user} />} />
            </>
          )}
          
          <Route path="/data" element={user.role === "ادمین" || user.role === "تیم_تخصصی" ? <DataManagement user={user} /> : <Navigate to="/" replace />} />
          <Route path="/data/*" element={user.role === "ادمین" || user.role === "تیم_تخصصی" ? <DataManagement user={user} /> : <Navigate to="/" replace />} />
          
          <Route path="/admin" element={user.role === "ادمین" ? <AdminPanel /> : <Navigate to="/" replace />} />
          <Route path="/admin/*" element={user.role === "ادمین" ? <AdminPanel /> : <Navigate to="/" replace />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
