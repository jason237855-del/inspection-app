/** Work roles used to split an on-site inspection between team members. */
export const ROLE_OPTIONS = ["業務", "水電", "土建"] as const;

export type InspectRole = (typeof ROLE_OPTIONS)[number];

export const ALL_ROLES = "全部" as const;
export type RoleFilter = InspectRole | typeof ALL_ROLES;

export const asRoles = (v: unknown): InspectRole[] =>
  Array.isArray(v) ? (v.filter((r) => ROLE_OPTIONS.includes(r as InspectRole)) as InspectRole[]) : [];

/**
 * An entry is visible when no role filter is active, when it carries no role
 * mapping (shared work), or when it is assigned to the selected role.
 */
export const matchesRole = (roles: InspectRole[] | undefined, filter: RoleFilter) =>
  filter === ALL_ROLES || !roles || roles.length === 0 || roles.includes(filter);
