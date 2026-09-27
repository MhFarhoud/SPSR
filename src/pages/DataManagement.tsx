import React, { useState, useEffect } from "react";
import { fetchData, resetAllData } from "../api";
import { User, AppData } from "../types";
import { Database, Download, FileSpreadsheet, Trash2, AlertTriangle } from "lucide-react";
import * as xlsx from "xlsx";

export function DataManagement({ user }: { user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const handleDownloadBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `backup_sps_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const handleExportChildren = () => {
    const exportData = data.children.map(c => ({
      "شناسه": c.childId,
      "نام": c.firstName,
      "نام خانوادگی": c.lastName,
      "تاریخ تولد": c.birthDate,
      "جنسیت": c.gender,
      "تلفن والد": c.parentContactPhone,
      "مقطع": c.currentStage,
      "تاریخ ثبت": new Date(c.createdAt).toLocaleDateString("fa-IR")
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "کودکان");
    xlsx.writeFile(wb, `children_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleResetAllData = async () => {
    if (resetConfirmation !== "ریست کامل") return;
    setResetting(true);
    setResetError("");
    try {
      const result = await resetAllData(user.id, resetPassword);
      setData(await fetchData());
      setResetSuccess(`داده‌ها پاک شدند. نسخه پشتیبان در پوشه backups با نام ${result.backupName} ذخیره شد.`);
      setShowResetDialog(false);
      setResetConfirmation("");
      setResetPassword("");
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "ریست اطلاعات ناموفق بود.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مدیریت داده‌ها</h2>
          <p className="mt-1 text-sm text-gray-500">پشتیبان‌گیری و دریافت خروجی از اطلاعات سیستم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">پشتیبان‌گیری کل سیستم (JSON)</h3>
          <p className="text-sm text-gray-500 mb-6">
            شامل تمامی کودکان، فرم‌ها، کاربران، مراکز، لاگ‌ها و سایر تنظیمات نرم‌افزار.
          </p>
          <button 
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            دریافت بک‌آپ
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">خروجی اکسل کودکان</h3>
          <p className="text-sm text-gray-500 mb-6">
            دریافت لیست تمام کودکان ثبت‌شده در سیستم جهت تحلیل‌های آماری خارجی.
          </p>
          <button 
            onClick={handleExportChildren}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            دانلود فایل Excel
          </button>
        </div>

        {user.role === "ادمین" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">ریست کل داده‌ها</h3>
            <p className="text-sm text-gray-500 mb-6">
              کودکان، فرم‌ها، مراکز و حساب‌های غیرمدیر پاک می‌شوند. حساب مدیر سیستم باقی می‌ماند و قبل از ریست، نسخه پشتیبان خودکار ساخته می‌شود.
            </p>
            {resetSuccess && <p role="status" className="mb-3 text-xs text-green-700">{resetSuccess}</p>}
            <button onClick={() => { setResetError(""); setShowResetDialog(true); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Trash2 className="w-4 h-4" /> ریست کل داده‌ها
            </button>
          </div>
        )}
      </div>

      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-data-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
            <div className="mb-4 flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-7 w-7" />
              <h3 id="reset-data-title" className="text-lg font-bold">تأیید ریست کل داده‌ها</h3>
            </div>
            <p className="mb-3 text-sm leading-7 text-gray-700">این کار همه کودکان، فرم‌ها، مراکز، کاربران غیرمدیر، گزارش‌ها و تنظیمات دسترسی را حذف می‌کند. حساب‌های مدیر سیستم حفظ می‌شوند.</p>
            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">پیش از پاک‌سازی، نسخه کامل فعلی به‌صورت خودکار در پوشه <code dir="ltr">backups</code> ذخیره می‌شود.</p>
            <label className="mb-2 block text-sm font-medium text-gray-700">برای فعال‌شدن پاک‌سازی، عبارت <strong>ریست کامل</strong> را وارد کنید.</label>
            <input autoFocus value={resetConfirmation} onChange={event => setResetConfirmation(event.target.value)} className="mb-4 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-500 focus:outline-none" />
            <label className="mb-2 block text-sm font-medium text-gray-700">رمز عبور حساب مدیر سیستم</label>
            <input type="password" autoComplete="current-password" value={resetPassword} onChange={event => setResetPassword(event.target.value)} className="mb-4 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-500 focus:outline-none" />
            {resetError && <p role="alert" className="mb-3 text-sm text-red-700">{resetError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowResetDialog(false); setResetConfirmation(""); setResetPassword(""); }} disabled={resetting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">انصراف</button>
              <button onClick={handleResetAllData} disabled={resetting || resetConfirmation !== "ریست کامل" || !resetPassword} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {resetting ? "در حال ریست..." : "تأیید و پاک‌سازی"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
