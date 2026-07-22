import { useState, type ComponentType, type ReactNode } from "react";

const avatarSizes = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-24 w-24 text-2xl" };

export function StudentAvatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: keyof typeof avatarSizes }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || "ط";
  return (
    <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-900 ${avatarSizes[size]}`} aria-label={`صورة الطالب ${name}`}>
      {src && !failed ? <img src={src} alt={`صورة الطالب ${name}`} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : initials}
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-[28px] font-bold leading-tight text-slate-950 md:text-[34px]">{title}</h1>{description && <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">{description}</p>}</div>{action}</header>;
}

export function StatisticCard({ label, value, helper, icon: Icon }: { label: string; value: string | number; helper?: string; icon: ComponentType<{ className?: string }> }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><strong className="mt-2 block text-3xl font-bold text-slate-950">{value}</strong>{helper && <p className="mt-1 text-[13px] text-slate-500">{helper}</p>}</div><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#0B63CE]"><Icon className="h-5 w-5" /></span></div></article>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: ComponentType<{ className?: string }>; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[#0B63CE]"><Icon className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function ProfileInfoRow({ label, value }: { label: string; value?: string | null }) {
  return <div className="border-b border-slate-100 py-4 last:border-0"><dt className="text-[13px] font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-[15px] font-semibold text-slate-900">{value || "غير محدد"}</dd></div>;
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-h-7 items-center rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-800">{children}</span>;
}
