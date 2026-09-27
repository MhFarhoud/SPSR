import React, { useState } from "react";
import { loginUser, updateUserPassword } from "../api";
import { Activity, Lock, Phone, KeyRound } from "lucide-react";
import type { User } from "../types";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await loginUser(phone, password);
      if (res.success && res.user) {
        if (password === "4411" || password === "14411") {
          setTempUser(res.user);
          setRequirePasswordChange(true);
        } else {
          onLogin(res.user);
        }
      } else {
        setError(res.message || "خطا در ورود");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند");
      return;
    }
    if (newPassword.length < 4) {
      setError("رمز عبور باید حداقل ۴ کاراکتر باشد");
      return;
    }
    try {
      const res = await updateUserPassword(tempUser!.id, newPassword);
      if (res.success) {
        onLogin(tempUser!);
      } else {
        setError("خطا در تغییر رمز عبور");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-8 border border-gray-100">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Activity className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">سامانه پایش سلامت</h1>
            <p className="text-sm text-gray-500 mt-2">
              {requirePasswordChange ? "تغییر رمز عبور پیش‌فرض" : "ورود به پنل کاربری"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
            {error}
          </div>
        )}

        {!requirePasswordChange ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">شماره تماس</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09120000000"
                  className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رمز عبور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              ورود به سیستم
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-sm mb-6 border border-orange-100">
              شما با رمز عبور پیش‌فرض وارد شده‌اید. لطفاً جهت حفظ امنیت حساب کاربری، رمز عبور خود را تغییر دهید.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رمز عبور جدید</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="رمز جدید"
                  className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تکرار رمز عبور جدید</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز"
                  className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              تغییر رمز و ورود
            </button>
          </form>
        )}

        <div className="mt-6 bg-gray-50 p-4 rounded-xl text-xs text-gray-500 space-y-2 border border-gray-200">
          <p className="font-bold text-gray-700">راهنمای دمو:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>مدیر سیستم: <code className="font-mono text-gray-700">09120000000</code></li>
            <li>مربی: <code className="font-mono text-gray-700">09120000001</code></li>
            <li>رمز عبور پیش‌فرض: <code className="font-mono text-gray-700">4411</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
