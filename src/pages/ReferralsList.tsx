import React, { useState, useEffect } from "react";
import { Target, Search, ExternalLink, Activity, Filter, Clock } from "lucide-react";
import { fetchData } from "../api";
import { User, AppData, ReferralDecision } from "../types";
import { Badge } from "../components/ui/Badge";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function ReferralsList({ user }: { user?: User }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "active" | "completed" | "failed" | "followup">(() => {
    const requested = location.pathname.split("/").pop();
    return ["pending", "active", "completed", "failed", "followup"].includes(requested || "") ? requested as any : "all";
  });

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  useEffect(() => {
    const requested = location.pathname.split("/").pop();
    if (["pending", "active", "completed", "failed", "followup"].includes(requested || "")) setFilterMode(requested as any);
    else if (requested === "referrals") setFilterMode("all");
  }, [location.pathname]);

  const changeFilterMode = (mode: "all" | "pending" | "active" | "completed" | "failed" | "followup") => {
    setFilterMode(mode);
    navigate(mode === "all" ? "/referrals" : `/referrals/${mode}`, { replace: true });
  };

  if (!data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  let referrals = data.referralDecisions || [];

  // Filter based on user role per PDF 6.27
  // - مربی: has no access (handled in App.tsx routing)
  // - سرمربی: can only see simple status if needed
  // - سوپروایزر: can only see referrals in their area
  // - مدیریت: full access
  // - درمانگر: only their own (handled in TherapistDashboard)
  if (user?.role === "سوپروایزر") {
    const coveredChildren = data.children.filter(c => user.centerIds.includes(c.currentCenterId)).map(c => c.id);
    referrals = referrals.filter(r => coveredChildren.includes(r.childId));
  } else if (user?.role === "سرمربی") {
    const coveredChildren = data.children.filter(c => user.centerIds.includes(c.currentCenterId)).map(c => c.id);
    referrals = referrals.filter(r => coveredChildren.includes(r.childId));
  }

  // Quick filters per PDF 6.2
  switch (filterMode) {
    case "pending":
      referrals = referrals.filter(r => r.status.includes("انتظار"));
      break;
    case "active":
      referrals = referrals.filter(r => r.status === "در_حال_درمان" || r.status === "درمان_شروع_شده");
      break;
    case "completed":
      referrals = referrals.filter(r => r.status === "درمان_پایان_یافته");
      break;
    case "failed":
      referrals = referrals.filter(r => r.status === "ارجاع_لغو_شده" || r.status === "خانواده_مراجعه_نکرده" || r.status === "درمان_موقتا_متوقف" || r.status === "رد_شده");
      break;
    case "followup":
      referrals = referrals.filter(r => r.status === "نیازمند_پیگیری_پروژه");
      break;
  }

  if (statusFilter) {
    referrals = referrals.filter(r => r.status === statusFilter);
  }

  if (search) {
    referrals = referrals.filter(r => {
      const child = data.children.find(c => c.id === r.childId);
      const name = child ? `${child.firstName} ${child.lastName}` : "";
      return name.includes(search) || r.childId.includes(search) || (r.therapistName && r.therapistName.includes(search));
    });
  }

  const getStatusBadge = (status: string) => {
    if (status.includes("پایان") || status.includes("تکمیل")) return <Badge variant="success">{status.replace(/_/g, ' ')}</Badge>;
    if (status.includes("انتظار") || status.includes("پیگیری")) return <Badge variant="warning">{status.replace(/_/g, ' ')}</Badge>;
    if (status.includes("لغو") || status.includes("متوقف") || status.includes("رد") || status.includes("نکرده")) return <Badge variant="danger">{status.replace(/_/g, ' ')}</Badge>;
    return <Badge variant="info">{status.replace(/_/g, ' ')}</Badge>;
  };

  const getChildName = (childId: string) => {
    const child = data.children.find(c => c.id === childId);
    return child ? `${child.firstName} ${child.lastName}` : childId;
  };

  const getProjectPerson = (id?: string) => {
    if (!id) return "نامشخص";
    const person = data.users.find(u => u.id === id);
    return person ? person.fullName : "نامشخص";
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">مدیریت ارجاعات</h2>
            <p className="text-sm text-gray-500">لیست کودکانی که به خدمات تخصصی خارج از مرکز ارجاع شده‌اند</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { id: "all", label: "همه ارجاعات" },
          { id: "pending", label: "در انتظار" },
          { id: "active", label: "در حال انجام" },
          { id: "completed", label: "تکمیل شده" },
          { id: "failed", label: "ناموفق / متوقف" },
          { id: "followup", label: "نیازمند پیگیری" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => changeFilterMode(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterMode === tab.id 
                ? "bg-indigo-600 text-white" 
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="جستجوی کودک، شناسه، درمانگر..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="ایجاد_شده">ایجاد شده</option>
          <option value="ارسال_شده">ارسال شده</option>
          <option value="در_انتظار_پذیرش_درمانگر">در انتظار پذیرش</option>
          <option value="پذیرفته_شده">پذیرفته شده</option>
          <option value="رد_شده">رد شده</option>
          <option value="در_انتظار_تماس_با_خانواده">در انتظار تماس</option>
          <option value="وقت_تعیین_شده">وقت تعیین شده</option>
          <option value="خانواده_مراجعه_نکرده">مراجعه نکرده</option>
          <option value="درمان_شروع_شده">شروع درمان</option>
          <option value="در_حال_درمان">در حال درمان</option>
          <option value="درمان_موقتا_متوقف">متوقف</option>
          <option value="درمان_پایان_یافته">پایان یافته</option>
          <option value="ارجاع_لغو_شده">لغو شده</option>
          <option value="نیازمند_پیگیری_پروژه">نیازمند پیگیری</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {referrals.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Activity className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg">هیچ ارجاعی با این شرایط یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-right">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 font-semibold">کودک</th>
                  <th className="px-4 py-4 font-semibold">درمانگر / مرکز</th>
                  <th className="px-4 py-4 font-semibold">وضعیت</th>
                  <th className="px-4 py-4 font-semibold">آخرین گزارش</th>
                  <th className="px-4 py-4 font-semibold">اقدام بعدی / پیگیری</th>
                  <th className="px-4 py-4 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map((ref) => {
                  const lastReport = ref.progressReports?.length > 0 
                    ? [...ref.progressReports].sort((a,b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())[0] 
                    : null;
                  
                  // PDF 6.21 highlight rows with no action for long time
                  const lastUpdate = ref.lastUpdateDate || ref.createdAt;
                  const isStagnant = (Date.now() - new Date(lastUpdate).getTime()) > 30 * 24 * 60 * 60 * 1000;

                  return (
                    <tr key={ref.id} className={`hover:bg-gray-50 transition-colors ${isStagnant ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900">{getChildName(ref.childId)}</p>
                        <p className="text-xs text-gray-500">{new Date(ref.createdAt).toLocaleDateString('fa-IR')}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">{ref.therapistName || "تعیین نشده"}</p>
                        <p className="text-xs text-gray-500">{ref.therapistCenter || "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(ref.status)}
                        {isStagnant && <div className="text-xs text-orange-600 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> رکود طولانی</div>}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {lastReport ? (
                          <>
                            <p className="font-medium">{new Date(lastReport.reportDate).toLocaleDateString('fa-IR')}</p>
                            <p className="text-xs text-gray-500">{lastReport.overallTrend}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">ندارد</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {ref.dueDate && <p className="text-xs text-gray-700">اقدام تا: {new Date(ref.dueDate).toLocaleDateString('fa-IR')}</p>}
                        <p className="text-xs text-gray-500 mt-1">مسئول: {getProjectPerson(ref.projectFollowUpPersonId)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Link to={`/referrals/${ref.id}`} className="flex items-center justify-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          <ExternalLink className="w-4 h-4" /> جزئیات
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
