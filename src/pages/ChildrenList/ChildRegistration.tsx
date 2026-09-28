import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchData } from "../../api";
import { AppData, Child, User } from "../../types";

export function ChildRegistration({ user }: { user: User }) {
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [formData, setFormData] = useState({
    nationalId: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "پسر",
    parentContactPhone: "",
    parentName: "",
    currentCenterId: "",
    currentClassId: "",
    currentStage: "" as Child["currentStage"] | "",
  });

  useEffect(() => { fetchData().then(setData); }, []);
  const availableCenters = (data?.centers || []).filter(center => user.role !== "سرمربی" || user.centerIds.includes(center.id));
  const availableClasses = (data?.classes || []).filter(group => group.centerId === formData.currentCenterId && (user.role !== "سرمربی" || group.supervisorId === user.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Fetch existing children to check for duplicates (PDF page 9)
      const resData = await fetch("/api/children?page=1&pageSize=1000");
      const dataRes = await resData.json();
      if (dataRes.success && dataRes.data) {
        const duplicates = dataRes.data.filter((c: any) => 
          c.firstName === formData.firstName && 
          c.lastName === formData.lastName && 
          c.currentCenterId === formData.currentCenterId
        );
        
        if (duplicates.length > 0) {
          const confirm = window.confirm(`اخطار: کودکی با نام ${formData.firstName} ${formData.lastName} در این مرکز قبلاً ثبت شده است.\nآیا مطمئن هستید که می‌خواهید کودک جدیدی با همین مشخصات ایجاد کنید؟`);
          if (!confirm) return;
        }
      }

      // 2. Submit new child
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, currentClassId: formData.currentClassId || undefined, createdBy: user.id })
      });
      const data = await res.json();
      if (data.success) {
        alert("کودک با موفقیت ثبت شد");
        navigate("/children");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("خطا در ارتباط با سرور");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">افزودن کودک جدید</h2>
        <p className="mt-1 text-sm text-gray-500">
          لطفاً اطلاعات هویتی و پایه کودک را با دقت وارد کنید.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی (ضروری جهت ورود والدین)</label>
              <input 
                required
                type="text" 
                dir="ltr"
                value={formData.nationalId}
                onChange={e => setFormData({...formData, nationalId: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام</label>
              <input 
                required
                type="text" 
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی</label>
              <input 
                required
                type="text" 
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ تولد (مثال: 1398/05/12)</label>
              <input 
                required
                type="text" 
                dir="ltr"
                value={formData.birthDate}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">جنسیت</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="پسر">پسر</option>
                <option value="دختر">دختر</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مرکز *</label>
              <select required value={formData.currentCenterId} onChange={e => setFormData({...formData, currentCenterId: e.target.value, currentClassId: ""})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">انتخاب مرکز</option>
                {availableCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مقطع *</label>
              <select required value={formData.currentStage} onChange={e => setFormData({...formData, currentStage: e.target.value as typeof formData.currentStage})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">انتخاب مقطع</option>
                <option value="مهد">مهد</option><option value="پیش‌دبستانی۱">پیش‌دبستانی ۱</option><option value="پیش‌دبستانی۲">پیش‌دبستانی ۲</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">کلاس و مربی</label>
              <select value={formData.currentClassId} onChange={e => setFormData({...formData, currentClassId: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" disabled={!formData.currentCenterId}>
                <option value="">بدون تخصیص کلاس</option>
                {availableClasses.map(group => { const teacher = data?.users.find(item => item.id === group.teacherId); return <option key={group.id} value={group.id}>{group.name}{teacher ? ` — ${teacher.fullName}` : " — مربی تعیین نشده"}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام والد/سرپرست</label>
              <input 
                type="text" 
                value={formData.parentName}
                onChange={e => setFormData({...formData, parentName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">شماره موبایل والد</label>
              <input 
                required
                type="tel" 
                dir="ltr"
                value={formData.parentContactPhone}
                onChange={e => setFormData({...formData, parentContactPhone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
          >
            انصراف
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            ثبت اطلاعات کودک
          </button>
        </div>
      </form>
    </div>
  );
}
