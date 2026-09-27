import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchData, updateReferral } from "../api";
import { User, AppData, ReferralDecision, TherapistReport } from "../types";
import { Badge } from "../components/ui/Badge";
import { Tabs, Tab } from "../components/ui/Tabs";
import { 
  User as UserIcon, Activity, FileText, CheckSquare, Clock, 
  Phone, CheckCircle2, XCircle, AlertTriangle 
} from "lucide-react";

export function ReferralDetails({ user }: { user?: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<AppData | null>(null);
  const [referral, setReferral] = useState<ReferralDecision | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [reportModal, setReportModal] = useState(false);
  const [newReport, setNewReport] = useState<Partial<TherapistReport>>({
    sessionCount: 1, overallTrend: "بدون_تغییر", familyCooperation: "متوسط", attendanceStatus: "منظم", treatmentStatus: "در_جریان", needsContinuation: true
  });

  useEffect(() => {
    fetchData().then(d => {
      setData(d);
      const ref = d.referralDecisions?.find(r => r.id === id);
      if (ref) setReferral(ref);
    });
  }, [id]);

  if (!data || !referral) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const child = data.children.find(c => c.id === referral.childId);
  if (!child) return <div className="p-8 text-center text-red-500">کودک یافت نشد.</div>;

  const isTherapist = user?.role === "درمانگر";
  const isSupervisor = user?.role === "سوپروایزر";
  const isAdmin = user?.role === "ادمین" || user?.role === "تیم_تخصصی";

  let tabs: Tab[] = [
    { id: "summary", label: "خلاصه ارجاع", icon: FileText },
    { id: "treatment", label: "روند درمان و جلسات", icon: Activity },
    { id: "history", label: "تاریخچه و تایم‌لاین", icon: Clock }
  ];

  if (!isTherapist) {
    tabs.splice(1, 0, { id: "info", label: "اطلاعات ارجاع", icon: UserIcon });
    tabs.splice(3, 0, { id: "project", label: "پیگیری پروژه", icon: CheckSquare });
  }

  const getStatusBadge = (status: string) => {
    if (status.includes("پایان") || status.includes("تکمیل")) return <Badge variant="success">{status.replace(/_/g, ' ')}</Badge>;
    if (status.includes("انتظار") || status.includes("پیگیری")) return <Badge variant="warning">{status.replace(/_/g, ' ')}</Badge>;
    if (status.includes("لغو") || status.includes("متوقف") || status.includes("رد") || status.includes("نکرده")) return <Badge variant="danger">{status.replace(/_/g, ' ')}</Badge>;
    return <Badge variant="info">{status.replace(/_/g, ' ')}</Badge>;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!window.confirm("آیا از تغییر وضعیت اطمینان دارید؟")) return;
    try {
      await updateReferral(referral.id, { status: newStatus as any });
      alert("وضعیت با موفقیت به‌روزرسانی شد");
      window.location.reload();
    } catch (e) {
      alert("خطا در به‌روزرسانی");
    }
  };

  const handleReportSubmit = async () => {
    try {
      const report: TherapistReport = {
        id: "rep_" + Date.now(),
        referralId: referral.id,
        reportDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        sessionCount: newReport.sessionCount || 1,
        familyCooperation: newReport.familyCooperation || "متوسط",
        overallTrend: newReport.overallTrend || "بدون_تغییر",
        attendanceStatus: newReport.attendanceStatus || "منظم",
        treatmentStatus: newReport.treatmentStatus || "در_جریان",
        needsContinuation: newReport.needsContinuation ?? true,
        needsProjectAction: false,
        shortDescription: newReport.shortDescription || ""
      };
      
      const updatedReports = [...(referral.progressReports || []), report];
      await updateReferral(referral.id, { progressReports: updatedReports });
      alert("گزارش با موفقیت ثبت شد");
      setReportModal(false);
      window.location.reload();
    } catch (e) {
      alert("خطا در ثبت گزارش");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isTherapist ? `${child.firstName} ${child.lastName}` : `پرونده ارجاع: ${child.firstName} ${child.lastName}`}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="font-mono">{referral.id}</span>
              <span>•</span>
              <span>تاریخ ارجاع: {new Date(referral.createdAt).toLocaleDateString('fa-IR')}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(referral.status)}
            <span className="text-xs text-gray-500">آخرین تغییر: {new Date(referral.lastUpdateDate || referral.createdAt).toLocaleDateString('fa-IR')}</span>
          </div>
        </div>

        {/* Therapist Action Bar */}
        {isTherapist && (
          <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100 flex gap-3 items-center">
            <span className="text-sm font-medium text-indigo-800">عملیات درمانگر:</span>
            
            {(referral.status === "ارسال_شده" || referral.status === "در_انتظار_پذیرش_درمانگر") && (
              <>
                <button onClick={() => handleStatusChange("پذیرفته_شده")} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"><CheckCircle2 className="w-4 h-4" /> پذیرش ارجاع</button>
                <button onClick={() => handleStatusChange("رد_شده")} className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-200"><XCircle className="w-4 h-4" /> عدم پذیرش</button>
              </>
            )}

            {referral.status === "پذیرفته_شده" && (
              <button onClick={() => handleStatusChange("در_انتظار_تماس_با_خانواده")} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"><Phone className="w-4 h-4" /> شروع تماس با خانواده</button>
            )}

            {(referral.status === "در_انتظار_تماس_با_خانواده" || referral.status === "وقت_تعیین_شده") && (
              <>
                <button onClick={() => handleStatusChange("درمان_شروع_شده")} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">اعلام شروع جلسات درمان</button>
                <button onClick={() => handleStatusChange("خانواده_مراجعه_نکرده")} className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-200">خانواده مراجعه نکرد</button>
              </>
            )}

            {(referral.status === "درمان_شروع_شده" || referral.status === "در_حال_درمان") && (
              <>
                <button onClick={() => setReportModal(true)} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"><FileText className="w-4 h-4" /> ثبت گزارش جلسه</button>
                <button onClick={() => handleStatusChange("درمان_پایان_یافته")} className="flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">اعلام پایان درمان</button>
                <button onClick={() => handleStatusChange("درمان_موقتا_متوقف")} className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded text-sm hover:bg-orange-200">توقف موقت درمان</button>
              </>
            )}
            
            {referral.status === "درمان_موقتا_متوقف" && (
              <button onClick={() => handleStatusChange("در_حال_درمان")} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">از سرگیری درمان</button>
            )}
          </div>
        )}

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">اطلاعات پایه</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">نام کودک:</span>
                  <span className="font-medium text-gray-900">{child.firstName} {child.lastName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">سن کودک:</span>
                  <span className="font-medium">{Math.floor((Date.now() - new Date(child.birthDate).getTime()) / 31557600000)} سال</span>
                </div>
                {!isTherapist && (
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">نام والد:</span>
                    <span className="font-medium">{child.parentName}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">شماره تماس والد:</span>
                  <span className="font-medium dir-ltr text-indigo-600">{child.parentContactPhone}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">علت اصلی ارجاع:</span>
                  <span className="font-medium">{referral.reason || "ثبت نشده"}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">اطلاعات درمانگر تخصیص‌یافته</h3>
              {referral.therapistId ? (
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">نام درمانگر:</span>
                    <span className="font-bold text-gray-900">{referral.therapistName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">مرکز درمان:</span>
                    <span className="font-medium">{referral.therapistCenter || "خارج از شبکه"}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">نوع خدمت:</span>
                    <span className="font-medium">{referral.serviceType || "مشاوره / روان‌درمانی"}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-orange-800 text-sm">درمانگری به این پرونده تخصیص داده نشده است.</p>
                  {(isAdmin || isSupervisor) && (
                    <button className="mt-3 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">
                      تخصیص درمانگر
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "treatment" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">روند درمان و گزارشات جلسات</h3>
            {!referral.progressReports || referral.progressReports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">گزارشی برای این ارجاع ثبت نشده است.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referral.progressReports.map((report, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-indigo-600 font-bold text-sm bg-indigo-50 px-2 py-1 rounded">جلسه {report.sessionNumber} از {report.sessionCount}</span>
                        <span className="text-sm text-gray-500 mr-3">تاریخ: {new Date(report.reportDate).toLocaleDateString('fa-IR')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-xs text-gray-500 mb-1">همکاری خانواده</span>
                        <span className="text-sm font-medium">{report.familyCooperation}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-xs text-gray-500 mb-1">روند کلی</span>
                        <span className="text-sm font-medium">{report.overallTrend}</span>
                      </div>
                    </div>
                    {report.therapistNotes && (
                      <div className="mt-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm border border-blue-100">
                        <strong>توضیحات درمانگر:</strong> {report.therapistNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {reportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">ثبت گزارش درمان</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره جلسه</label>
                  <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={newReport.sessionNumber} onChange={e => setNewReport({...newReport, sessionNumber: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تعداد کل جلسات تاکنون</label>
                  <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={newReport.sessionCount} onChange={e => setNewReport({...newReport, sessionCount: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">همکاری خانواده</label>
                <select className="w-full border rounded-lg px-3 py-2" value={newReport.familyCooperation || "متوسط"} onChange={e => setNewReport({...newReport, familyCooperation: e.target.value as any})}>
                  <option value="ضعیف">ضعیف</option>
                  <option value="متوسط">متوسط</option>
                  <option value="خوب">خوب</option>
                  <option value="عالی">عالی</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">روند کلی</label>
                <select className="w-full border rounded-lg px-3 py-2" value={newReport.overallTrend || "بدون_تغییر"} onChange={e => setNewReport({...newReport, overallTrend: e.target.value as any})}>
                  <option value="بدتر_شده">بدتر شده</option>
                  <option value="بدون_تغییر">بدون تغییر</option>
                  <option value="بهبود_نسبی">بهبود نسبی</option>
                  <option value="بهبود_کامل">بهبود کامل</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات تکمیلی</label>
                <textarea className="w-full border rounded-lg px-3 py-2 h-24" value={newReport.therapistNotes || ""} onChange={e => setNewReport({...newReport, therapistNotes: e.target.value})}></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setReportModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">انصراف</button>
                <button onClick={handleReportSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">ثبت گزارش</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
