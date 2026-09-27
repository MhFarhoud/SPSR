import type { AppData, Child, TeacherAssessment, ParentAssessment, User, Center, ClassGroup, ChildEnrollment } from "./types";

export async function fetchData(): Promise<AppData> {
  const res = await fetch("/api/data");
  return res.json();
}

export async function resetAllData(userId: string, password: string) {
  const res = await fetch("/api/data/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password, confirmation: "ریست کامل" })
  });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.message || "ریست اطلاعات ناموفق بود");
  return result as { success: true; backupName: string; message: string };
}

export async function fetchPermissions() {
  const res = await fetch("/api/permissions");
  if (!res.ok) throw new Error("دریافت تنظیمات دسترسی ناموفق بود");
  return (await res.json()).permissions as NonNullable<AppData["permissions"]>;
}

export async function savePermissions(permissions: NonNullable<AppData["permissions"]>) {
  const res = await fetch("/api/permissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions })
  });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.message || "ذخیره تنظیمات دسترسی ناموفق بود");
  return result;
}

export async function submitTeacherForm(form: TeacherAssessment): Promise<void> {
  await fetch("/api/forms/teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form)
  });
}

export async function submitParentForm(form: ParentAssessment): Promise<void> {
  await fetch("/api/forms/parent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form)
  });
}

export async function loginUser(phone: string, password: string):Promise<{success: boolean, user?: User, message?: string}> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });
  return res.json();
}

export async function createUser(user: Partial<User>): Promise<{success: boolean, user?: User}> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function updateUser(id: string, user: Partial<User>): Promise<{success: boolean, user?: User}> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function updateUserPassword(id: string, password: string): Promise<{success: boolean}> {
  const res = await fetch(`/api/users/${id}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  return res.json();
}

export async function createChild(child: Child): Promise<void> {
  await fetch("/api/children", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(child)
  });
}

export async function createCenter(center: Partial<Center>): Promise<void> {
  await fetch("/api/centers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(center)
  });
}

export async function updateCenter(id: string, center: Partial<Center>): Promise<void> {
  await fetch(`/api/centers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(center)
  });
}

export async function createClass(classGroup: Partial<ClassGroup>): Promise<void> {
  const res = await fetch("/api/centers/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classGroup)
  });
  const result = await res.json();
  if (!res.ok || !result.success) throw new Error(result.message || "ایجاد کلاس ناموفق بود");
}

export async function updateClass(id: string, classGroup: Partial<ClassGroup>): Promise<void> {
  await fetch(`/api/centers/classes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classGroup)
  });
}

export async function createEnrollment(enrollment: Partial<ChildEnrollment>): Promise<void> {
  await fetch("/api/centers/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enrollment)
  });
}

export async function createAction(action: Partial<any>): Promise<void> {
  await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action)
  });
}

export async function updateAction(id: string, updates: Partial<any>): Promise<void> {
  await fetch(`/api/actions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
}

export async function updateReferral(id: string, updates: Partial<any>): Promise<void> {
  await fetch(`/api/referrals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
}
