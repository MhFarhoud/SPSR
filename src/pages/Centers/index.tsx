import React, { useEffect, useState } from "react";
import { Building, Users, AlertCircle, Plus, ChevronDown, ChevronLeft } from "lucide-react";
import { fetchData, createCenter, updateCenter, createClass } from "../../api";
import { User, AppData, Center, ClassGroup } from "../../types";
import { useNavigate } from "react-router-dom";

/** PDF بخش ۳: مراکز
 * هدف: مشخص کردن ساختار سازمانی پروژه
 * سطوح نظارتی: 
 * - مرکز <- مربی/کلاس <- کودکان
 * - سوپروایزر -> سرمربی -> مربی -> کودکان
 * 
 * دسترسی نقش‌ها (PDF 3.5):
 * - مربی: این منو را نبیند
 * - سرمربی: فقط ساختار محدوده خود را ببیند، بدون امکان تغییر
 * - سوپروایزر: مشاهده محدوده خود، بدون تغییر ساختار اصلی
 * - تیم_تخصصی/ادمین: امکان ایجاد/ویرایش مرکز، تخصیص، مشاهده کامل
 */
export function CentersModule({ user }: { user: User }) {
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // Modal states
  const [isCenterModalOpen, setCenterModalOpen] = useState(false);
  const [isClassModalOpen, setClassModalOpen] = useState(false);
  
  // Form states
  const [editingCenter, setEditingCenter] = useState<Partial<Center> | null>(null);
  const [newClassData, setNewClassData] = useState<Partial<ClassGroup>>({ name: "", centerId: "", supervisorId: "", teacherId: "" });
  const [classFormError, setClassFormError] = useState("");

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  const refreshData = async () => {
    const d = await fetchData();
    setData(d);
  };

  const handleSaveCenter = async () => {
    if (!editingCenter?.name) return alert("نام مرکز الزامی است");
    try {
      if (editingCenter.id) {
        await updateCenter(editingCenter.id, editingCenter);
      } else {
        await createCenter(editingCenter);
      }
      setCenterModalOpen(false);
      refreshData();
    } catch (e) {
      alert("خطا در ذخیره مرکز");
    }
  };

  const handleSaveClass = async () => {
    if (!newClassData.name?.trim() || !newClassData.centerId || !newClassData.supervisorId) {
      setClassFormError("نام کلاس، مرکز و سرمربی را انتخاب کنید.");
      return;
    }
    setClassFormError("");
    try {
      await createClass(newClassData);
      setClassModalOpen(false);
      refreshData();
    } catch (e) {
      setClassFormError(e instanceof Error ? e.message : "خطا در ایجاد کلاس");
    }
  };

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isAdminOrSpec = user.role === "ادمین" || user.role === "تیم_تخصصی";
  const isSupervisor = user.role === "سوپروایزر";
  const isHeadCoach = user.role === "سرمربی";

  // Filter centers based on user role
  let visibleCenters = data.centers;
  if (!isAdminOrSpec) {
    visibleCenters = visibleCenters.filter(c => user.centerIds.includes(c.id));
  }

  const renderTree = () => {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          ساختار سازمانی مراکز
        </h3>
        
        {visibleCenters.map(center => {
          const isExpanded = expandedNodes[center.id];
          const centerClasses = data.classes?.filter(c => c.centerId === center.id) || [];
          const centerHeadCoaches = data.users.filter(u => u.role === "سرمربی" && u.centerIds.includes(center.id));
          
          return (
            <div key={center.id} className="mb-4">
              <div 
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => toggleNode(center.id)}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
                <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Building className="w-4 h-4" />
                </div>
                <span className="font-bold text-gray-900">{center.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mr-2">مرکز</span>
                {isAdminOrSpec && (
                  <div className="mr-auto flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setNewClassData({ name: "", centerId: center.id, supervisorId: "", teacherId: "" }); setClassFormError(""); setClassModalOpen(true); }}
                      className="text-xs text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded"
                    >
                      افزودن کلاس
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingCenter(center); setCenterModalOpen(true); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                    >
                      ویرایش
                    </button>
                  </div>
                )}
              </div>
              
              {isExpanded && (
                <div className="mr-8 pr-4 border-r-2 border-gray-100 py-2 space-y-4">
                  {/* Head Coaches Level */}
                  {centerHeadCoaches.map(hc => {
                    const hcIsExpanded = expandedNodes[hc.id];
                    // Filter classes supervised by this head coach
                    let hcClasses = centerClasses.filter(c => c.supervisorId === hc.id);
                    // If the user is a head coach, only show their own supervised classes
                    if (isHeadCoach && user.id !== hc.id) return null;

                    return (
                      <div key={hc.id}>
                        <div 
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => toggleNode(hc.id)}
                        >
                          {hcIsExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
                          <span className="font-medium text-gray-800">سرمربی: {hc.fullName}</span>
                        </div>
                        
                        {hcIsExpanded && (
                          <div className="mr-6 pr-4 border-r-2 border-gray-100 py-2 space-y-2">
                            {hcClasses.map(cls => {
                              const clsIsExpanded = expandedNodes[cls.id];
                              const teacher = data.users.find(u => u.id === cls.teacherId);
                              const classChildren = data.children.filter(c => c.currentClassId === cls.id);
                              
                              return (
                                <div key={cls.id}>
                                  <div 
                                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                                    onClick={() => toggleNode(cls.id)}
                                  >
                                    {clsIsExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
                                    <span className="text-sm text-gray-700">مربی: {teacher?.fullName || 'نامشخص'} (کلاس: {cls.name})</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mr-2">{classChildren.length} کودک</span>
                                  </div>
                                  
                                  {clsIsExpanded && (
                                    <div className="mr-6 pr-4 border-r-2 border-gray-100 py-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {classChildren.map(child => (
                                        <div key={child.id} className="p-2 border border-gray-100 rounded bg-gray-50 text-xs flex items-center justify-between">
                                          <span>{child.firstName} {child.lastName}</span>
                                          <span className="text-gray-400">{child.childId}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {centerHeadCoaches.length === 0 && (
                    <div className="text-sm text-gray-500 p-2">سرمربی تخصیص داده نشده است.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {visibleCenters.length === 0 && (
          <div className="text-center text-gray-500 py-8">مرکزی برای نمایش وجود ندارد.</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مدیریت مراکز و کلاس‌ها</h2>
          <p className="mt-1 text-sm text-gray-500">مشاهده و مدیریت ساختار سازمانی</p>
        </div>
        {isAdminOrSpec && (
          <button 
            onClick={() => { setEditingCenter({ name: "", region: "" }); setCenterModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            افزودن مرکز جدید
          </button>
        )}
      </div>

      {renderTree()}

      {/* Center Modal */}
      {isCenterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingCenter?.id ? "ویرایش مرکز" : "مرکز جدید"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام مرکز *</label>
                <input 
                  type="text" 
                  value={editingCenter?.name || ""} 
                  onChange={(e) => setEditingCenter({ ...editingCenter, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">منطقه/توضیحات</label>
                <input 
                  type="text" 
                  value={editingCenter?.region || ""} 
                  onChange={(e) => setEditingCenter({ ...editingCenter, region: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCenterModalOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">انصراف</button>
              <button onClick={handleSaveCenter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">ذخیره</button>
            </div>
          </div>
        </div>
      )}

      {/* Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">افزودن کلاس جدید</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام کلاس *</label>
                <input 
                  type="text" 
                  value={newClassData.name || ""} 
                  onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سرمربی *</label>
                <select required
                  value={newClassData.supervisorId || ""} 
                  onChange={(e) => setNewClassData({ ...newClassData, supervisorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">انتخاب سرمربی...</option>
                  {data.users.filter(u => u.role === "سرمربی" && (u.centerIds || []).includes(newClassData.centerId!)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
                {!data.users.some(u => u.role === "سرمربی" && (u.centerIds || []).includes(newClassData.centerId!)) && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                    سرمربی برای این مرکز ثبت نشده است. ابتدا در مدیریت کاربران، یک سرمربی ایجاد یا ویرایش کنید و این مرکز را به او اختصاص دهید.
                    {user.role === "ادمین" && <button type="button" onClick={() => navigate("/admin/users")} className="mr-2 font-bold text-indigo-700 underline">رفتن به مدیریت کاربران</button>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مربی (اختیاری)</label>
                <select
                  value={newClassData.teacherId || ""} 
                  onChange={(e) => setNewClassData({ ...newClassData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">بدون مربی</option>
                  {data.users.filter(u => u.role === "مربی" && (u.centerIds || []).includes(newClassData.centerId!)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
                {!data.users.some(u => u.role === "مربی" && (u.centerIds || []).includes(newClassData.centerId!)) && <p className="mt-1 text-xs text-gray-500">مربی‌ای به این مرکز تخصیص داده نشده است؛ می‌توانید کلاس را بدون مربی ثبت کنید.</p>}
              </div>
            </div>
            {classFormError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{classFormError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setClassModalOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">انصراف</button>
              <button onClick={handleSaveClass} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">ذخیره</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
