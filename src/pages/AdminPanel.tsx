import React, { useState, useEffect } from "react";
import { fetchData, fetchPermissions, savePermissions, createUser, updateUserPassword, updateUser } from "../api";
import type { User, Role, AppData } from "../types";
import { Shield, Plus, KeyRound, Users, Lock, Settings, FileText, Eye } from "lucide-react";
import { Tabs, Tab } from "../components/ui/Tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Dashboard } from "./Dashboard";

export function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<NonNullable<AppData["centers"]>>([]);
  const [loading, setLoading] = useState(true);
  
  // Parse tab from URL
  const initialTab = location.pathname.split("/").pop();
  const validTabs = ["users", "roles", "forms", "audit"];
  const defaultTab = validTabs.includes(initialTab || "") ? initialTab! : "users";
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const tab = location.pathname.split("/").pop();
    if (validTabs.includes(tab || "")) setActiveTab(tab!);
  }, [location.pathname]);

  // Sync tab clicks with URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/admin/${tabId}`, { replace: true });
  };

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<Role>("مربی");
  const [newCenterIds, setNewCenterIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<Role>("مربی");
  const [editCenterIds, setEditCenterIds] = useState<string[]>([]);

  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("4411");

  // Permission Matrix State
  const modules = [
    { id: "cases", name: "پرونده کودکان" },
    { id: "assessments", name: "فرم‌ها و ارزیابی‌ها" },
    { id: "centers", name: "مراکز و کلاس‌ها" },
    { id: "reports", name: "گزارش‌ها" },
    { id: "admin", name: "تنظیمات سیستم" }
  ];
  const systemRoles = ["مربی", "سرمربی", "سوپروایزر", "تیم_تخصصی", "ادمین"];
  
  const [permissions, setPermissions] = useState<Record<string, Record<string, { view: boolean, create: boolean, edit: boolean, delete: boolean, approve: boolean }>>>({
    "ادمین": modules.reduce((acc, m) => ({ ...acc, [m.id]: { view: true, create: true, edit: true, delete: true, approve: true } }), {}),
    "سوپروایزر": {
      cases: { view: true, create: false, edit: true, delete: false, approve: true },
      assessments: { view: true, create: false, edit: false, delete: false, approve: true },
      centers: { view: true, create: true, edit: true, delete: false, approve: false },
      reports: { view: true, create: false, edit: false, delete: false, approve: false },
      admin: { view: false, create: false, edit: false, delete: false, approve: false },
    }
  }); // Seeded with mock state for demo
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsMessage, setPermissionsMessage] = useState("");
  const [showCoachPreview, setShowCoachPreview] = useState(false);

  const handleTogglePermission = (role: string, moduleId: string, action: string) => {
    setPermissions(prev => {
      const rolePerms = prev[role] || {};
      const modPerms = rolePerms[moduleId] || { view: false, create: false, edit: false, delete: false, approve: false };
      return {
        ...prev,
        [role]: {
          ...rolePerms,
          [moduleId]: {
            ...modPerms,
            [action]: !modPerms[action as keyof typeof modPerms]
          }
        }
      };
    });
  };

  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<string>("مربی");

  useEffect(() => {
    loadUsers();
    fetchPermissions()
      .then(saved => { if (Object.keys(saved).length) setPermissions(saved); })
      .catch(() => setPermissionsMessage("بارگذاری تنظیمات ذخیره‌شده ناموفق بود"))
      .finally(() => setPermissionsLoading(false));
  }, []);

  const handleSavePermissions = async () => {
    setPermissionsSaving(true);
    setPermissionsMessage("");
    try {
      await savePermissions(permissions);
      setPermissionsMessage("تنظیمات دسترسی با موفقیت ذخیره شد.");
    } catch (error) {
      setPermissionsMessage(error instanceof Error ? error.message : "ذخیره تنظیمات ناموفق بود");
    } finally {
      setPermissionsSaving(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      setUsers(data.users);
      setCenters(data.centers || []);
    } catch (e) {}
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (["مربی", "سرمربی", "سوپروایزر"].includes(newRole) && newCenterIds.length === 0) {
      alert("برای مربی، سرمربی و سوپروایزر حداقل یک مرکز انتخاب کنید تا در کلاس‌ها قابل تخصیص باشند.");
      return;
    }
    await createUser({ fullName: newFullName, phone: newPhone, role: newRole, centerIds: newCenterIds });
    setIsCreating(false);
    setNewFullName("");
    setNewPhone("");
    setNewRole("مربی");
    setNewCenterIds([]);
    loadUsers();
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditFullName(user.fullName);
    setEditPhone(user.phone);
    setEditRole(user.role);
    setEditCenterIds(user.centerIds || []);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      if (["مربی", "سرمربی", "سوپروایزر"].includes(editRole) && editCenterIds.length === 0) {
        alert("برای مربی، سرمربی و سوپروایزر حداقل یک مرکز انتخاب کنید تا در کلاس‌ها قابل تخصیص باشند.");
        return;
      }
      await updateUser(editingUserId, { fullName: editFullName, phone: editPhone, role: editRole, centerIds: editCenterIds });
      setEditingUserId(null);
      loadUsers();
    }
  };

  const renderCenterAssignment = (selectedIds: string[], onChange: (centerIds: string[]) => void) => (
    <fieldset className="md:col-span-2 rounded-lg border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">مراکز تحت پوشش</legend>
      {centers.length === 0 ? <p className="text-xs text-amber-700">ابتدا یک مرکز در بخش مدیریت مراکز بسازید.</p> : (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {centers.map(center => (
            <label key={center.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={selectedIds.includes(center.id)} onChange={event => onChange(event.target.checked ? [...selectedIds, center.id] : selectedIds.filter(id => id !== center.id))} className="rounded text-indigo-600" />
              {center.name}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetId) {
      await updateUserPassword(resetId, newPassword);
      setResetId(null);
      setNewPassword("4411");
      alert("رمز عبور با موفقیت تغییر کرد.");
    }
  };

  const tabs: Tab[] = [
    { id: "users", label: "کاربران سیستم", icon: Users },
    { id: "roles", label: "نقش‌ها و دسترسی‌ها", icon: Lock },
    { id: "forms", label: "تنظیمات فرم‌ها", icon: Settings },
    { id: "audit", label: "گزارش عملیات (Audit Log)", icon: FileText },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">پنل مدیریت سیستم (Admin)</h2>
              <p className="text-sm text-gray-300 mt-1">مدیریت کاربران، نقش‌ها و تنظیمات امنیتی</p>
            </div>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUserId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
              <h3 className="text-lg font-bold mb-4">ویرایش اطلاعات کاربر</h3>
              <form onSubmit={handleSaveEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نام و نام خانوادگی</label>
                  <input required value={editFullName} onChange={e => setEditFullName(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره تماس (نام کاربری)</label>
                  <input required dir="ltr" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-2 border rounded-lg text-left" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نقش در سامانه</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value as Role)} className="w-full p-2 border rounded-lg">
                    <option value="مربی">مربی</option>
                    <option value="سرمربی">سرمربی</option>
                    <option value="سوپروایزر">سوپروایزر</option>
                    <option value="تیم_تخصصی">تیم تخصصی</option>
                    <option value="ادمین">مدیر سیستم (ادمین)</option>
                  </select>
                </div>
                {renderCenterAssignment(editCenterIds, setEditCenterIds)}
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">ذخیره تغییرات</button>
                  <button type="button" onClick={() => setEditingUserId(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200">انصراف</button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              تعریف کاربر جدید
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateUser} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام و نام خانوادگی</label>
                <input required value={newFullName} onChange={e => setNewFullName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره تماس (کدملی)</label>
                <input required value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-2 border rounded-lg text-sm text-left" dir="ltr" placeholder="0912..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نقش</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as Role)} className="w-full p-2 border rounded-lg text-sm">
                  <option value="مربی">مربی</option>
                  <option value="سرمربی">سرمربی</option>
                  <option value="سوپروایزر">سوپروایزر</option>
                  <option value="تیم_تخصصی">تیم تخصصی</option>
                  <option value="ادمین">ادمین</option>
                </select>
              </div>
              {renderCenterAssignment(newCenterIds, setNewCenterIds)}
              <div>
                <button type="submit" className="w-full bg-green-600 text-white p-2 rounded-lg text-sm font-medium hover:bg-green-700">ثبت کاربر (رمز: 4411)</button>
              </div>
            </form>
          )}

          {resetId && (
            <form onSubmit={handleResetPassword} className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-orange-900 mb-1">تغییر رمز عبور کاربر ({users.find(u => u.id === resetId)?.fullName})</label>
                <input required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border border-orange-300 rounded-lg text-sm text-left" dir="ltr" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setResetId(null)} className="px-4 py-2 border border-orange-300 text-orange-800 rounded-lg text-sm hover:bg-orange-100">انصراف</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">ذخیره رمز</button>
              </div>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 uppercase tracking-wider">نام و نام خانوادگی</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 uppercase tracking-wider">کدملی / شماره تماس</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 uppercase tracking-wider">نقش سیستم</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 uppercase tracking-wider">مراکز</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{u.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-right" dir="ltr">{u.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800 border border-gray-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{(u.centerIds || []).map(id => centers.find(center => center.id === id)?.name).filter(Boolean).join("، ") || "بدون مرکز"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium bg-indigo-50 px-3 py-1.5 rounded-lg ml-2">ویرایش مشخصات</button>
                      <button onClick={() => setResetId(u.id)} className="text-orange-600 hover:text-orange-800 text-xs font-medium bg-orange-50 px-3 py-1.5 rounded-lg">
                        <KeyRound className="w-4 h-4 inline" /> تغییر رمز
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "roles" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-gray-900">ماتریس دسترسی‌ها (Permission Matrix)</h3>
              <div className="flex items-center gap-3">
              {permissionsMessage && <span role="status" className="text-sm text-gray-600">{permissionsMessage}</span>}
              <button onClick={handleSavePermissions} disabled={permissionsSaving || permissionsLoading} className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                {permissionsSaving ? "در حال ذخیره..." : "ذخیره تنظیمات دسترسی"}
              </button>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex gap-4 overflow-x-auto">
                {systemRoles.map(role => (
                  <button 
                    key={role}
                    onClick={() => setSelectedRoleForMatrix(role)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      selectedRoleForMatrix === role 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    نقش: {role}
                  </button>
                ))}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                <div className="mb-4 text-sm text-gray-500">
                  <Shield className="w-4 h-4 inline ml-1" />
                  در حال ویرایش دسترسی‌های نقش <strong>{selectedRoleForMatrix}</strong> در ماژول‌های مختلف سیستم:
                </div>
                <button onClick={() => setShowCoachPreview(true)} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"><Eye className="w-4 h-4"/>مشاهده پنل مربی</button>
                </div>
                
                <table className="min-w-full divide-y divide-gray-200 text-sm text-center border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-700 text-right w-1/3">ماژول / بخش</th>
                      <th className="px-4 py-3 font-medium text-gray-600">مشاهده (View)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">ایجاد (Create)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">ویرایش (Edit)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">حذف (Delete)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">تایید (Approve)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {modules.map(module => {
                      const modPerms = permissions[selectedRoleForMatrix]?.[module.id] || { view: false, create: false, edit: false, delete: false, approve: false };
                      return (
                        <tr key={module.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-right font-medium text-gray-800 border-l">{module.name}</td>
                          <td className="px-4 py-3 border-l">
                            <input type="checkbox" checked={modPerms.view} onChange={() => handleTogglePermission(selectedRoleForMatrix, module.id, 'view')} className="w-4 h-4 text-indigo-600 rounded" />
                          </td>
                          <td className="px-4 py-3 border-l">
                            <input type="checkbox" checked={modPerms.create} onChange={() => handleTogglePermission(selectedRoleForMatrix, module.id, 'create')} className="w-4 h-4 text-indigo-600 rounded" />
                          </td>
                          <td className="px-4 py-3 border-l">
                            <input type="checkbox" checked={modPerms.edit} onChange={() => handleTogglePermission(selectedRoleForMatrix, module.id, 'edit')} className="w-4 h-4 text-indigo-600 rounded" />
                          </td>
                          <td className="px-4 py-3 border-l">
                            <input type="checkbox" checked={modPerms.delete} onChange={() => handleTogglePermission(selectedRoleForMatrix, module.id, 'delete')} className="w-4 h-4 text-red-500 rounded" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={modPerms.approve} onChange={() => handleTogglePermission(selectedRoleForMatrix, module.id, 'approve')} className="w-4 h-4 text-green-500 rounded" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {showCoachPreview && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 overflow-auto" role="dialog" aria-modal="true" aria-label="پیش‌نمایش پنل مربی">
          <div className="min-h-full bg-gray-50">
            <div className="sticky top-0 z-20 flex items-center justify-between bg-amber-50 border-b border-amber-200 px-5 py-3">
              <span className="text-sm font-medium text-amber-900">پیش‌نمایش پنل مربی (نمایشی)</span>
              <button onClick={() => setShowCoachPreview(false)} className="rounded-lg bg-white border px-4 py-2 text-sm">بازگشت به تنظیمات</button>
            </div>
            <Layout user={{ id: "preview-coach", fullName: "پیش‌نمایش مربی", phone: "", role: "مربی", centerIds: [] }} onLogout={() => setShowCoachPreview(false)}>
              <Dashboard user={{ id: "preview-coach", fullName: "پیش‌نمایش مربی", phone: "", role: "مربی", centerIds: [] }} />
            </Layout>
          </div>
        </div>
      )}

      {activeTab === "forms" && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">مدیریت نسخه‌های فرم (Form Builder)</h3>
          <p>تنظیمات مربوط به نسخه‌بندی فرم‌های ارزیابی (TPCS و PPCS) و بروزرسانی سوالات، نقاط برش و دستورالعمل‌ها در آینده در این قسمت قرار می‌گیرد.</p>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">گزارشات سیستمی (Audit Log)</h3>
          <p>گزارش تمام رویدادهای مهم سیستمی نظیر ورود کاربران، ثبت فرم‌ها، و تغییرات حساس (مانند تغییر رمز عبور) جهت نظارت امنیتی ذخیره و نمایش داده می‌شود.</p>
        </div>
      )}

    </div>
  );
}
