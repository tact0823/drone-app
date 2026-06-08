export function getRouteParam(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

export function getProjectId(params: Record<string, string | string[] | undefined>): string {
  return getRouteParam(params.id);
}
