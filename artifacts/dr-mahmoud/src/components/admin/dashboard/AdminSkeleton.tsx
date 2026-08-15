import React from "react";

export function TableSkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-800/60 bg-[#131E31]/40">
      <td className="p-4">
        <div className="h-4 w-4 rounded bg-slate-800" />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-800 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 rounded bg-slate-800" />
            <div className="h-2.5 w-20 rounded bg-slate-800/60" />
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="h-3 w-28 rounded bg-slate-800" />
      </td>
      <td className="p-4">
        <div className="h-3.5 w-24 rounded bg-slate-800" />
      </td>
      <td className="p-4">
        <div className="h-5 w-20 rounded-full bg-slate-800/80" />
      </td>
      <td className="p-4">
        <div className="h-5 w-16 rounded-full bg-slate-800/80" />
      </td>
      <td className="p-4">
        <div className="h-3 w-16 rounded bg-slate-800" />
      </td>
      <td className="p-4">
        <div className="h-8 w-20 rounded-lg bg-slate-800" />
      </td>
    </tr>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-800/80 bg-[#131E31] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-slate-800" />
        <div className="h-9 w-9 rounded-xl bg-slate-800" />
      </div>
      <div className="h-7 w-16 rounded bg-slate-800" />
      <div className="h-2.5 w-32 rounded bg-slate-800/60" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#131E31]">
      <table className="w-full text-right">
        <thead className="bg-slate-900/60 border-b border-slate-800">
          <tr>
            <th className="p-4"><div className="h-4 w-4 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-20 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-16 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-20 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-16 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-16 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-16 rounded bg-slate-800" /></th>
            <th className="p-4"><div className="h-3 w-12 rounded bg-slate-800" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableSkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
