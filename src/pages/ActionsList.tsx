import React, { useState, useEffect } from "react";
import { fetchData, createAction, updateAction } from "../api";
import type { User, AppData, ActionItem, Child } from "../types";
import { CheckCircle2, Clock, ListTodo, AlertCircle, Plus } from "lucide-react";
import { Tabs, Tab } from "../components/ui/Tabs";
import { Badge } from "../components/ui/Badge";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function ActionsList({ user }: { user: User }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const requested = location.pathname.split("/").pop();
    return ["my-tasks", "overdue", "completed", "all"].includes(requested || "") ? requested! : "my-tasks";
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New action form state
  const [newActionText, setNewActionText] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState(user.id);
  const [dueDate, setDueDate] = useState("");

  const loadData = async () => {
    setLoading(true);
    const d = await fetchData();
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const requested = location.pathname.split("/").pop();
    if (["my-tasks", "overdue", "completed", "all"].includes(requested || "")) setActiveTab(requested!);
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/actions/${tab}`, { replace: true });
  };

  if (loading || !data) return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAction({
      childId: selectedChildId,
      action: newActionText,
      responsiblePersonId: assignedUserId,
      dueDate: dueDate,
      status: "شروع_نشده",
      creatorId: user.id
    });
    setShowCreateModal(false);
    loadData();
  };

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    await updateAction(actionId, { status: newStatus });
    loadData();
  };

  // Filter actions based on RBAC
  let allowedActions = data.actionItems;
  if (user.role === "مربی") {
    // Teachers only see actions assigned to them
    allowedActions = data.actionItems.filter(a => a.responsiblePersonId === user.id);
  } else if (user.role === "سرمربی") {
    // Head coaches see actions for children in their center
    const centerChildIds = data.children.filter(c => user.centerIds.includes(c.currentCenterId)).map(c => c.id);
    allowedActions = data.actionItems.filter(a => centerChildIds.includes(a.childId));
  }

  const now = new Date();
  
  const myTasks = allowedActions.filter(a => a.responsiblePersonId === user.id && a.status !== "انجام_شده");
  const overdueTasks = allowedActions.filter(a => a.status !== "انجام_شده" && new Date(a.dueDate) < now);
  const completedTasks = allowedActions.filter(a => a.status === "انجام_شده");
  const allTasks = allowedActions;

  let displayTasks: ActionItem[] = [];
  if (activeTab === "my-tasks") displayTasks = myTasks;
  else if (activeTab === "overdue") displayTasks = overdueTasks;
  else if (activeTab === "completed") displayTasks = completedTasks;
  else if (activeTab === "all") displayTasks = allTasks;

  const tabs: Tab[] = [
    { id: "my-tasks", label: `وظایف من (${myTasks.length})`, icon: ListTodo },
    { id: "overdue", label: `عقب‌افتاده (${overdueTasks.length})`, icon: AlertCircle },
    { id: "completed", label: `تکمیل شده`, icon: CheckCircle2 },
    { id: "all", label: `تمام اقدامات`, icon: Clock },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-800 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">اقدامات و ارجاعات (Tasks)</h2>
              <p className="text-sm text-emerald-100 mt-1">مدیریت وظایف محول شده به تیم و پیگیری موارد</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-emerald-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-50 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            ارجاع جدید (ایجاد وظیفه)
          </button>
        </div>
        
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {displayTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">هیچ وظیفه‌ای در این دسته‌بندی یافت نشد.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right font-medium text-gray-500">کودک مربوطه</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">شرح اقدام</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">مسئول انجام</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">سررسید (Due Date)</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">وضعیت</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayTasks.map(task => {
                const child = data.children.find(c => c.id === task.childId);
                const assignee = data.users.find(u => u.id === task.responsiblePersonId);
                const isOverdue = new Date(task.dueDate) < now && task.status !== "انجام_شده";

                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {child ? <Link to={`/cases/${child.id}`} className="text-indigo-600 hover:underline">{child.firstName} {child.lastName}</Link> : "نامشخص"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 w-1/3">{task.action}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {assignee?.fullName?.charAt(0)}
                        </div>
                        {assignee?.fullName || "ناشناس"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium" dir="ltr">
                      <span className={isOverdue ? "text-danger-600 font-bold" : ""}>
                        {new Date(task.dueDate).toLocaleDateString("fa-IR")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {task.status === "شروع_نشده" && <Badge variant="warning">شروع نشده</Badge>}
                      {task.status === "در_حال_انجام" && <Badge variant="info">در حال انجام</Badge>}
                      {task.status === "انجام_شده" && <Badge variant="success">تکمیل شده</Badge>}
                    </td>
                    <td className="px-6 py-4">
                      {task.status !== "انجام_شده" && task.responsiblePersonId === user.id && (
                        <div className="flex gap-2">
                          {task.status === "شروع_نشده" && (
                            <button onClick={() => handleStatusChange(task.id, "در_حال_انجام")} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 font-medium">شروع کار</button>
                          )}
                          <button onClick={() => handleStatusChange(task.id, "انجام_شده")} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded hover:bg-emerald-100 font-medium">پایان کار (تیک)</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-3">
              <Plus className="w-5 h-5 text-emerald-600" />
              تعریف وظیفه جدید (ارجاع)
            </h3>
            <form onSubmit={handleCreateAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مرتبط با کودک (پرونده)</label>
                <select required value={selectedChildId} onChange={e => setSelectedChildId(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- انتخاب کنید --</option>
                  {data.children.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مسئول انجام وظیفه (ارجاع به)</label>
                <select required value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500">
                  {data.users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شرح دقیق اقدام یا وظیفه</label>
                <textarea required value={newActionText} onChange={e => setNewActionText(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 h-24" placeholder="مثال: بررسی مجدد شرایط پرخاشگری با والدین..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مهلت انجام (سررسید میلادی موقت)</label>
                <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500" dir="ltr" />
              </div>

              <div className="flex gap-3 pt-4 border-t mt-6">
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm">ثبت وظیفه</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
