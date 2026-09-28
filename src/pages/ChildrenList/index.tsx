import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Upload, Search, Link as LinkIcon, Archive, ArchiveRestore } from "lucide-react";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Child, CaseStatus, User } from "../../types";

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy path for browsers that deny clipboard access.
    }
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

/** PDF بخش ۲: کودکان
 * دسترسی‌ها (PDF 2.3):
 * - مربی: فقط کودکان خودش (بدون افزودن/حذف/تغییر مرکز)
 * - سرمربی: کودکان مربیان تحت پوشش + فیلتر مربی/مرکز/وضعیت
 * - سوپروایزر: محدوده نظارتی + فیلتر مرکز/سرمربی/مربی/وضعیت
 * - مدیریت تخصصی: همه + جستجوی سراسری + فیلتر کامل + افزودن/اصلاح/انتقال/آرشیو
 * صفحه‌بندی (PDF 2.4): ۲۰/۵۰/۱۰۰ + حفظ page/filter/scroll هنگام بازگشت
 */
export function ChildrenList({ user }: { user?: User }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<Child[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const isArchivePage = location.pathname.includes("/archive");
  const pageSize = 20;

  useEffect(() => {
    fetchData(page, search);
  }, [page, isArchivePage]);

  const fetchData = (page: number, searchQuery: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search: searchQuery, userId: user?.id || "", archive: String(isArchivePage), status: statusFilter });
    fetch(`/api/children?${params}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
          setTotal(res.total);
        }
      });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(1, search);
  };

  const toggleArchive = async (child: Child) => {
    const archived = !child.archived;
    const message = archived ? `پرونده ${child.firstName} ${child.lastName} بایگانی شود؟` : `پرونده ${child.firstName} ${child.lastName} از بایگانی خارج شود؟`;
    if (!window.confirm(message)) return;
    const response = await fetch(`/api/children/${child.id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, archived })
    });
    const result = await response.json();
    if (!response.ok || !result.success) return alert(result.message || "تغییر وضعیت بایگانی انجام نشد.");
    fetchData(page, search);
  };

  const getStatusBadge = (status?: CaseStatus) => {
    switch(status) {
      case "عادی": return <Badge variant="success">عادی</Badge>;
      case "نیازمند_بررسی": return <Badge variant="warning">نیازمند بررسی</Badge>;
      case "در_حال_ارزیابی": return <Badge variant="info">در حال ارزیابی</Badge>;
      case "مداخله": return <Badge variant="danger">مداخله</Badge>;
      case "فالوآپ": return <Badge variant="warning">فالوآپ</Badge>;
      case "بایگانی": return <Badge variant="default">بایگانی</Badge>;
      default: return <Badge variant="default">{status || "نامشخص"}</Badge>;
    }
  };

  // Permission checks
  const canAddChild = user?.role === "ادمین" || user?.role === "تیم_تخصصی" || user?.role === "سرمربی";
  const canImport = user?.role === "ادمین" || user?.role === "تیم_تخصصی";
  const canArchive = user?.role === "ادمین" || user?.role === "تیم_تخصصی";

  const columns: Column<Child>[] = [
    { header: "شناسه", accessor: (row) => <span className="font-mono text-gray-500 text-xs">{row.childId || "---"}</span> },
    { header: "نام و نام خانوادگی", accessor: (row) => <span className="font-medium text-gray-900">{row.firstName} {row.lastName}</span> },
    { header: "مقطع", accessor: "currentStage" },
    ...(user?.role !== "مربی" ? [{ header: "وضعیت پرونده", accessor: (row: Child) => getStatusBadge(row.caseStatus) }] : []),
    ...(canArchive ? [{ header: "بایگانی", accessor: (row: Child) => <button type="button" onClick={event => { event.stopPropagation(); void toggleArchive(row); }} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${row.archived ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>{row.archived ? <><ArchiveRestore className="h-3.5 w-3.5" /> بازگردانی</> : <><Archive className="h-3.5 w-3.5" /> بایگانی</>}</button> }] : []),
    { header: "لینک والد", accessor: (row) => (
      <button 
        onClick={async (e) => {
          e.stopPropagation();
          const link = `${window.location.origin}/p/${row.childId}`;
          if (await copyText(link)) alert("لینک والد کپی شد");
          else window.prompt("کپی خودکار در این مرورگر ممکن نیست؛ لینک را کپی کنید:", link);
        }}
        className="text-indigo-600 hover:text-indigo-800 p-1"
        title="کپی لینک اختصاصی والد"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    )},
    { header: "تاریخ ثبت", accessor: (row) => new Date(row.createdAt).toLocaleDateString('fa-IR') }
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isArchivePage ? "بایگانی پرونده‌ها" : "مدیریت کودکان"}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isArchivePage ? "پرونده‌های بایگانی‌شده؛ ادمین و تیم تخصصی می‌توانند آن‌ها را بازگردانی کنند." : user?.role === "مربی" ? "کودکان تحت آموزش شما" : "لیست کودکان ثبت شده در سیستم"}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          {canImport && (
            <button 
              onClick={() => navigate("/children/import")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" />
              ورود گروهی
            </button>
          )}
          {canAddChild && (
            <button 
              onClick={() => navigate("/children/new")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              افزودن کودک
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام، نام خانوادگی، یا شناسه..." 
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {/* Status filter — per PDF different roles have different filters */}
          {user?.role !== "مربی" && !isArchivePage && (
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="عادی">عادی</option>
              <option value="نیازمند_بررسی">نیازمند بررسی</option>
              <option value="در_حال_ارزیابی">در حال ارزیابی</option>
              <option value="مداخله">مداخله</option>
              <option value="فالوآپ">فالوآپ</option>
            </select>
          )}
          <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-200">
            جستجو
          </button>
        </form>
      </div>

      <div className="h-[600px]">
        <DataTable 
          columns={columns}
          data={data}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/child/${row.id}`)}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
