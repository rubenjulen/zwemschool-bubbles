// Rolmodel (§4 requirements). De rol staat in JWT app_metadata zodat hij niet
// door de gebruiker te wijzigen is, en wordt óók in de database via RLS
// afgedwongen (least privilege, SEC-2).
export const ROLES = [
  "guardian",
  "instructor",
  "lead_instructor",
  "admin",
  "finance_admin",
  "system_admin",
] as const;

export type Role = (typeof ROLES)[number];

/** Rollen die als 'staff' gelden en MFA verplicht hebben (SEC-1). */
export const STAFF_ROLES: Role[] = [
  "instructor",
  "lead_instructor",
  "admin",
  "finance_admin",
  "system_admin",
];

export function isStaff(role: Role | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

/** Welke route-prefix hoort bij welke rol (gebruikt door de middleware). */
export function defaultRouteForRole(role: Role | undefined): string {
  switch (role) {
    case "instructor":
    case "lead_instructor":
      return "/vandaag";
    case "admin":
    case "finance_admin":
    case "system_admin":
      return "/beheer/dashboard";
    case "guardian":
      return "/dashboard";
    default:
      return "/login";
  }
}

// Zelf-aangemelde gebruikers hebben (nog) geen rol in hun token. Zij zijn per
// definitie ouder/verzorger; staff krijgen expliciet een rol toegewezen door
// beheer. Daarom is 'guardian' de standaardrol bij een ontbrekende/onbekende rol.
export function roleFromClaims(
  claims: { app_metadata?: Record<string, unknown> } | null,
): Role {
  const role = claims?.app_metadata?.["role"];
  return ROLES.includes(role as Role) ? (role as Role) : "guardian";
}
