import React from "react";
import { TeacherDashboard } from "./TeacherDashboard";
import { HeadCoachDashboard } from "./HeadCoachDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { SpecializedAdminDashboard } from "./SpecializedAdminDashboard";
import { TherapistDashboard } from "./TherapistDashboard";
import type { User } from "../../types";

export function Dashboard({ user }: { user: User }) {
  switch (user.role) {
    case "مربی":
      return <TeacherDashboard user={user} />;
    case "سرمربی":
      return <HeadCoachDashboard user={user} />;
    case "سوپروایزر":
      return <SupervisorDashboard user={user} />;
    case "تیم_تخصصی":
    case "ادمین":
      return <SpecializedAdminDashboard user={user} />;
    case "درمانگر":
      return <TherapistDashboard user={user} />;
    default:
      return <div className="p-6 text-center text-red-500">نقش کاربری نامعتبر است</div>;
  }
}
