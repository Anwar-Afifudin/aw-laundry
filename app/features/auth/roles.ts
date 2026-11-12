export type AppRole = "CUSTOMER" | "ADMIN";
export type RoleHome = "/app" | "/admin";

export function isAppRole(role: string): role is AppRole {
  return role === "CUSTOMER" || role === "ADMIN";
}

export function getRoleHome(role: AppRole): RoleHome {
  return role === "ADMIN" ? "/admin" : "/app";
}
