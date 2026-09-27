import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Child } from "../types";
import { ParentForm } from "./ParentForm";
import { Activity, ShieldCheck, CheckCircle } from "lucide-react";

export function PublicParentForm() {
  const { childId } = useParams<{ childId: string }>();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [child, setChild] = useState<Child | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // For bypassing the requirement of full User object in ParentForm
  const dummyParentUser = {
    id: "parent",
    fullName: child?.parentName || "والد گرامی",
    role: "والد" as any, // bypassing strict Role check in UI
    phone: child?.parentContactPhone || "",
    centerIds: [child?.currentCenterId || ""]
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalId) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/verify-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, nationalId })
      });
      const data = await res.json();
      if (data.success) {
        setChild(data.child);
      } else {
        setError(data.message || "کد ملی نامعتبر است");
      }
    } catch (err) {
      console.error(err);
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-200">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ثبت موفقیت‌آمیز</h2>
          <p className="text-gray-600">
            والد گرامی، پرسشنامه شما با موفقیت در سامانه ثبت شد. از همکاری شما سپاسگزاریم.
          </p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-gray-200">
          <div className="flex items-center gap-2 justify-center mb-6 text-indigo-600">
            <Activity className="w-8 h-8" />
            <h1 className="text-xl font-bold text-gray-900">سامانه پایش سلامت روان</h1>
          </div>
          <h2 className="text-lg font-bold text-center text-gray-800 mb-2">ورود به فرم ارزیابی والد (PPCS)</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            جهت تکمیل ارزیابی، لطفاً کد ملی فرزندتان (کد پیگیری: {childId}) را وارد نمایید.
          </p>
          
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی کودک</label>
              <input
                type="text"
                required
                dir="ltr"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="مثال: 0012345678"
                className="w-full px-4 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center gap-2"
            >
              {loading ? "در حال اعتبارسنجی..." : <><ShieldCheck className="w-5 h-5"/> تایید و ورود به فرم</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-indigo-600 text-white p-6">
          <h2 className="text-xl font-bold">فرم ارزیابی سلامت و رفتار کودک (PPCS)</h2>
          <p className="text-indigo-100 mt-1">فرزند: {child.firstName} {child.lastName}</p>
        </div>
        <div className="p-6">
          <ParentForm 
            user={dummyParentUser} 
            childIdParam={childId}
            onSuccess={() => setSubmitted(true)}
          />
        </div>
      </div>
    </div>
  );
}
