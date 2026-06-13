interface AdminComingSoonProps {
  title: string;
  description: string;
}

export function AdminComingSoon({ title, description }: AdminComingSoonProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm font-medium text-blue-600">準備中</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}
