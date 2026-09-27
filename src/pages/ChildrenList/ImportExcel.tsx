import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle, AlertTriangle, ArrowRight, Download } from "lucide-react";
import { DataTable, Column } from "../../components/ui/DataTable";
import { User } from "../../types";
import * as xlsx from "xlsx";

export function ImportExcel({ user }: { user?: User }) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

  const handleDownloadSample = () => {
    const ws = xlsx.utils.json_to_sheet([
      {
        "کد ملی": "0011111111",
        "نام": "علی",
        "نام خانوادگی": "رضایی",
        "تاریخ تولد": "1398/05/12",
        "جنسیت": "پسر",
        "شماره تماس والد": "09120000000",
        "نام والد": "حسین",
        "مرکز": "مهد کودک شکوفه ۱",
        "مقطع": "مهد"
      },
      {
        "کد ملی": "0022222222",
        "نام": "سارا",
        "نام خانوادگی": "احمدی",
        "تاریخ تولد": "1397/08/20",
        "جنسیت": "دختر",
        "شماره تماس والد": "09121111111",
        "نام والد": "زهرا",
        "مرکز": "مهد کودک شکوفه ۲",
        "مقطع": "پیش‌دبستانی۱"
      }
    ]);

    // set column widths
    ws['!cols'] = [
      { wch: 15 }, // کد ملی
      { wch: 15 }, // نام
      { wch: 20 }, // نام خانوادگی
      { wch: 15 }, // تاریخ تولد
      { wch: 10 }, // جنسیت
      { wch: 20 }, // شماره تماس والد
      { wch: 15 }, // نام والد
      { wch: 25 }, // مرکز
      { wch: 15 }  // مقطع
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "کودکان");
    xlsx.writeFile(wb, "Sample_Children_Import.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/children/import-preview", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.preview);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("خطا در ارتباط با سرور");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter((r: any) => r.isValid).map((r: any) => r.data);
    
    if (validRows.length === 0) {
      alert("ردیف معتبری برای ثبت وجود ندارد.");
      return;
    }

    try {
      const res = await fetch("/api/children/import-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validRows })
      });
      const data = await res.json();
      if (data.success) {
        alert(`تعداد ${data.committed} پرونده با موفقیت ثبت شد.`);
        navigate("/children");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("خطا در ارتباط با سرور");
    }
  };

  const columns: Column<any>[] = [
    { header: "ردیف", accessor: "rowIndex" },
    { header: "نام", accessor: (row) => row.data["نام"] || "-" },
    { header: "نام خانوادگی", accessor: (row) => row.data["نام خانوادگی"] || "-" },
    { header: "تاریخ تولد", accessor: (row) => row.data["تاریخ تولد"] || "-" },
    { header: "وضعیت", accessor: (row) => (
      row.isValid ? 
        <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> معتبر</span> : 
        <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> خطا</span>
    )},
    { header: "خطاها", accessor: (row) => (
      <span className="text-red-500 text-xs">
        {row.errors?.join("، ")}
      </span>
    )}
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/children")} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ورود گروهی اطلاعات (Excel)</h2>
          <p className="mt-1 text-sm text-gray-500">
            برای ثبت گروهی کودکان، فایل اکسل را بر اساس قالب استاندارد آپلود کنید.
          </p>
        </div>
      </div>

      {!preview ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
          <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">انتخاب فایل اکسل</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            فقط فرمت‌های xlsx. و xls. مجاز هستند. پیشنهاد می‌شود قبل از آپلود، قالب استاندارد را دانلود کنید.
          </p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={handleDownloadSample}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              دانلود قالب
            </button>
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="px-4 py-2 border border-transparent rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                انتخاب فایل
              </button>
            </div>
          </div>

          {file && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md mx-auto flex items-center justify-between border border-gray-200">
              <span className="text-sm text-gray-700 truncate dir-ltr">{file.name}</span>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {isUploading ? "در حال پردازش..." : "آپلود و بررسی"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-sm text-gray-500">کل رکوردها</p>
              <p className="text-2xl font-bold text-gray-900">{preview.total}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border-green-200 bg-green-50 text-center">
              <p className="text-sm text-green-600">رکوردهای معتبر</p>
              <p className="text-2xl font-bold text-green-700">{preview.valid}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border-red-200 bg-red-50 text-center">
              <p className="text-sm text-red-600">دارای خطا</p>
              <p className="text-2xl font-bold text-red-700">{preview.invalid}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">پیش‌نمایش داده‌ها</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => setPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                لغو و آپلود مجدد
              </button>
              <button 
                onClick={handleCommit}
                disabled={preview.valid === 0}
                className="px-4 py-2 border border-transparent rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                ثبت {preview.valid} رکورد معتبر
              </button>
            </div>
          </div>

          <div className="h-[400px]">
            <DataTable 
              columns={columns}
              data={preview.rows}
              keyExtractor={(row) => row.rowIndex.toString()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
