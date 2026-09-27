import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export type Column<T> = {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
};

export function DataTable<T>({ 
  columns, 
  data, 
  keyExtractor, 
  onRowClick,
  page,
  pageSize,
  total,
  onPageChange
}: DataTableProps<T>) {
  
  const renderCell = (row: T, col: Column<T>) => {
    if (typeof col.accessor === "function") {
      return col.accessor(row);
    }
    return row[col.accessor] as React.ReactNode;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-right text-gray-500">
          <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-3 font-medium ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  داده‌ای برای نمایش وجود ندارد
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr 
                  key={keyExtractor(row)} 
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-6 py-4 whitespace-nowrap ${col.className || ""}`}>
                      {renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {page !== undefined && total !== undefined && pageSize !== undefined && onPageChange && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            نمایش <span className="font-medium">{(page - 1) * pageSize + (data.length > 0 ? 1 : 0)}</span> تا <span className="font-medium">{(page - 1) * pageSize + data.length}</span> از <span className="font-medium">{total}</span> نتیجه
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              disabled={page * pageSize >= total}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
