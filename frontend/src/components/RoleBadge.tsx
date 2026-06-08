interface RoleBadgeProps {
  role: 'operator' | 'admin';
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
      }`}
    >
      {isAdmin ? 'admin' : 'operator'}
    </span>
  );
}
