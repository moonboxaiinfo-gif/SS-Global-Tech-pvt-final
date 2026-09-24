import { loadLocalValue, saveLocalValue } from "@/lib/localStore";
import supabase, {
  getSupabaseConfigStatus,
  logSupabaseConfigDiagnostics,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase";

export type AppRole = "Owner" | "Manager" | "Accountant" | "Technician";
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  passwordHash?: string;
  active: boolean;
  createdAt: string;
  invitedAt?: string;
  authProvider?: "local" | "supabase";
};
export type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  signedInAt: string;
};
export type PasswordResetRequest = {
  id: string;
  email: string;
  createdAt: string;
  status: "Pending" | "Completed";
};

const USERS_KEY = "ss-global-auth-users";
const SESSION_KEY = "ss-global-auth-session";
const RESET_KEY = "ss-global-password-reset-requests";
const OWNER_HASH =
  "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f";
const DEVELOPER_HASH =
  "87274af01876341455b32d805946f272871bb42effa6604dccf28bb027afa82b";
const allowedRoles: AppRole[] = [
  "Owner",
  "Manager",
  "Accountant",
  "Technician",
];
export function normalizeAppRole(role: string): AppRole {
  return role === "Admin" || role === "Developer"
    ? "Owner"
    : role === "Employee"
      ? "Technician"
      : allowedRoles.includes(role as AppRole)
        ? (role as AppRole)
        : "Technician";
}
export function getAssignableRoles(): AppRole[] {
  return [...allowedRoles];
}
export function normalizeUserRole(role: string): string {
  return [
    "Owner",
    "Admin",
    "Manager",
    "Accountant",
    "Technician",
    "Employee",
    "Developer",
  ].includes(role)
    ? normalizeAppRole(role)
    : role;
}

const seedUsers: AuthUser[] = [];

function getUsers(): AuthUser[] {
  const stored = loadLocalValue<unknown>(USERS_KEY, seedUsers);
  const users = Array.isArray(stored) ? (stored as AuthUser[]) : seedUsers;
  return users
    .filter((user): user is AuthUser =>
      Boolean(
        user &&
          typeof user.id === "string" &&
          typeof user.email === "string" &&
          typeof user.role === "string" &&
          typeof user.active === "boolean"
      )
    )
    .map(user =>
      user.id === "user-owner"
        ? {
            ...user,
            email: "owner@admin.com",
            passwordHash: OWNER_HASH,
            role: "Owner" as string,
            active: true,
          }
        : { ...user, role: normalizeUserRole(user.role) }
    );
}
function setUsers(users: AuthUser[]) {
  saveLocalValue(USERS_KEY, users);
  window.dispatchEvent(new CustomEvent("ss-global-auth-users"));
}
export function getAuthUsers() {
  return getUsers();
}
export function getAuthSession() {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    const previewRequested =
      typeof window.location?.search === "string" &&
      new URLSearchParams(window.location.search).get("preview") === "guest";
    const previewStorage =
      typeof sessionStorage !== "undefined" ? sessionStorage : null;
    if (previewRequested)
      previewStorage?.setItem("ss-global-guest-preview", "true");
    if (
      previewStorage &&
      (previewRequested ||
        previewStorage.getItem("ss-global-guest-preview") === "true")
    ) {
      return {
        userId: "guest-preview",
        email: "guest@preview.local",
        displayName: "Guest Preview",
        role: "Owner",
        signedInAt: new Date().toISOString(),
      } satisfies AuthSession;
    }
  }
  const session = loadLocalValue<unknown>(SESSION_KEY, null);
  if (!session || typeof session !== "object") return null;
  const value = session as Partial<AuthSession>;
  return typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.role === "string"
    ? (value as AuthSession)
    : null;
}

/** Production source of truth for protected routes: Supabase Auth + profiles. */
export async function getSupabaseAuthSession(): Promise<AuthSession | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role,full_name,is_active")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error || !profile || profile.is_active === false) return null;
  return {
    userId: session.user.id,
    email: session.user.email || "",
    displayName:
      profile.full_name ||
      session.user.user_metadata?.full_name ||
      session.user.email ||
      "SS Global User",
    role: normalizeAppRole(profile.role),
    signedInAt: new Date().toISOString(),
  };
}
export function isOwner() {
  return getAuthSession()?.role === "Owner";
}
export function getResetRequests() {
  return loadLocalValue<PasswordResetRequest[]>(RESET_KEY, []);
}
function setResetRequests(requests: PasswordResetRequest[]) {
  saveLocalValue(RESET_KEY, requests);
}

async function hashPassword(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password)
    throw new Error("Enter your registered email and password.");
  logSupabaseConfigDiagnostics("login");
  if (supabaseUrl && supabaseAnonKey) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) throw new Error("Invalid email or password.");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileError || !profile) {
      await supabase.auth.signOut();
      throw new Error(
        "Your account profile is not configured. Contact the Owner."
      );
    }
    const session: AuthSession = {
      userId: data.user.id,
      email: data.user.email || normalizedEmail,
      displayName:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.display_name ||
        normalizedEmail,
      role: normalizeAppRole(profile.role),
      signedInAt: new Date().toISOString(),
    };
    saveLocalValue(SESSION_KEY, session);
    window.dispatchEvent(
      new CustomEvent("ss-global-auth-session", { detail: session })
    );
    return session;
  }
  if (import.meta.env.PROD) {
    const status = getSupabaseConfigStatus();
    throw new Error(
      !status.urlPresent || !status.anonKeyPresent
        ? "Authentication service is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify, then redeploy."
        : "Invalid email or password."
    );
  }
  const user = getUsers().find(
    entry => entry.email.toLowerCase() === normalizedEmail && entry.active
  );
  if (
    user?.passwordHash &&
    user.passwordHash === (await hashPassword(password))
  ) {
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: normalizeUserRole(user.role),
      signedInAt: new Date().toISOString(),
    };
    saveLocalValue(SESSION_KEY, session);
    window.dispatchEvent(
      new CustomEvent("ss-global-auth-session", { detail: session })
    );
    return session;
  }
  throw new Error("Invalid email or password.");
}

export function signOut() {
  void supabase.auth.signOut();
  try {
    sessionStorage.removeItem("ss-global-guest-preview");
  } catch {}
  saveLocalValue(SESSION_KEY, null);
  window.dispatchEvent(
    new CustomEvent("ss-global-auth-session", { detail: null })
  );
}

function assertOwner() {
  if (!isOwner())
    throw new Error("Only the Owner can manage users and passwords.");
}

export async function registerUser(input: {
  email: string;
  displayName: string;
  role: string;
}) {
  assertOwner();
  const email = input.email.trim().toLowerCase();
  if (!email || !input.displayName.trim())
    throw new Error("Provide a name and valid email.");
  if (getUsers().some(entry => entry.email.toLowerCase() === email))
    throw new Error("A user with this email already exists.");
  const user: AuthUser = {
    id: `user-${Date.now()}`,
    email,
    displayName: input.displayName.trim(),
    role: normalizeUserRole(input.role),
    passwordHash: undefined,
    active: true,
    createdAt: new Date().toISOString().slice(0, 10),
    invitedAt: new Date().toISOString(),
    authProvider: "supabase",
  };
  setUsers([user, ...getUsers()]);
  return user;
}

export async function resetUserPassword(userId: string, password: string) {
  assertOwner();
  void userId;
  void password;
  throw new Error(
    "Raw password resets are disabled. Send a secure password-reset email instead."
  );
}

export async function sendUserInvite(input: {
  email: string;
  displayName: string;
  role: string;
}) {
  assertOwner();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch("/api/rbac/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      return {
        sent: false,
        reason:
          payload.message || "The secure invite service is not configured.",
      };
    return { sent: true, reason: payload.message || "Invite sent." };
  } catch {
    return {
      sent: false,
      reason:
        "The secure invite service is unavailable; the user was kept as a local pending invite.",
    };
  }
}

export async function sendPasswordResetEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter an email address first.");
  if (!supabaseUrl || !supabaseAnonKey) {
    requestPasswordReset(normalizedEmail);
    return {
      sent: false,
      reason:
        "Supabase is not configured; the reset request was recorded locally.",
    };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    const response = await fetch("/api/rbac/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        payload.message || "Unable to request a password reset email."
      );
    return {
      sent: true,
      reason: payload.message || "Password reset email sent.",
    };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw new Error(error.message);
  return { sent: true, reason: "Password reset email sent." };
}

export function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    !getUsers().some(
      entry => entry.email.toLowerCase() === normalizedEmail && entry.active
    )
  )
    throw new Error("No active account matches that email.");
  const request: PasswordResetRequest = {
    id: `reset-${Date.now()}`,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    status: "Pending",
  };
  setResetRequests([
    request,
    ...getResetRequests().filter(
      entry => entry.email !== normalizedEmail || entry.status === "Completed"
    ),
  ]);
  return request;
}

export function updateOwnProfile(displayName: string) {
  const session = getAuthSession();
  if (!session) throw new Error("Sign in before updating your profile.");
  const nextName = displayName.trim();
  if (nextName.length < 2)
    throw new Error("Enter a display name with at least 2 characters.");
  const users = getUsers();
  const user = users.find(entry => entry.id === session.userId);
  if (!user) throw new Error("Your account could not be found.");
  setUsers(
    users.map(entry =>
      entry.id === user.id ? { ...entry, displayName: nextName } : entry
    )
  );
  const nextSession = { ...session, displayName: nextName };
  saveLocalValue(SESSION_KEY, nextSession);
  window.dispatchEvent(
    new CustomEvent("ss-global-auth-session", { detail: nextSession })
  );
  return nextSession;
}

export async function changePassword(
  email: string,
  currentPassword: string,
  nextPassword: string,
  confirmation: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter your email address.");
  if (nextPassword.length < 8)
    throw new Error("New password must be at least 8 characters.");
  if (nextPassword !== confirmation)
    throw new Error("New passwords do not match.");
  if (supabaseUrl && supabaseAnonKey) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: currentPassword,
    });
    if (error || !data.session)
      throw new Error("Current password is incorrect.");
    const { error: updateError } = await supabase.auth.updateUser({
      password: nextPassword,
    });
    if (updateError) throw new Error(updateError.message);
    await supabase.auth.signOut();
    saveLocalValue(SESSION_KEY, null);
    window.dispatchEvent(
      new CustomEvent("ss-global-auth-session", { detail: null })
    );
    return { synced: true };
  }
  const user = getUsers().find(
    entry => entry.email.toLowerCase() === normalizedEmail && entry.active
  );
  if (!user || user.passwordHash !== (await hashPassword(currentPassword)))
    throw new Error("Current password is incorrect.");
  const passwordHash = await hashPassword(nextPassword);
  setUsers(
    getUsers().map(entry =>
      entry.id === user.id ? { ...entry, passwordHash } : entry
    )
  );
  saveLocalValue(SESSION_KEY, null);
  window.dispatchEvent(
    new CustomEvent("ss-global-auth-session", { detail: null })
  );
  return { synced: false };
}

/** Complete a password reset after Supabase redirects back with a recovery session. */
export async function updatePasswordFromRecovery(
  nextPassword: string,
  confirmation: string
) {
  if (nextPassword.length < 8)
    throw new Error("New password must be at least 8 characters.");
  if (nextPassword !== confirmation)
    throw new Error("New passwords do not match.");
  const { data } = await supabase.auth.getSession();
  if (!data.session)
    throw new Error("This reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  saveLocalValue(SESSION_KEY, null);
  window.dispatchEvent(
    new CustomEvent("ss-global-auth-session", { detail: null })
  );
  return { synced: true };
}

export async function updateOwnPassword(
  currentPassword: string,
  nextPassword: string
) {
  const session = getAuthSession();
  if (!session) throw new Error("Sign in before changing your password.");
  return changePassword(
    session.email,
    currentPassword,
    nextPassword,
    nextPassword
  );
}

export async function updateAuthUserRole(userId: string, role: string) {
  assertOwner();
  const normalizedRole = normalizeUserRole(role);
  const users = getUsers();
  const user = users.find(entry => entry.id === userId);
  if (!user || user.role === "Owner") return null;
  const updated = { ...user, role: normalizedRole };
  if (supabaseUrl && supabaseAnonKey && !userId.startsWith("user-")) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: normalizedRole })
      .eq("id", userId);
    if (!error) {
      setUsers(users.map(entry => (entry.id === userId ? updated : entry)));
      return updated;
    }
  }
  setUsers(users.map(entry => (entry.id === userId ? updated : entry)));
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token && !userId.startsWith("user-")) {
      await fetch("/api/rbac/user-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, role: normalizedRole }),
      });
    }
  } catch {
    /* local-first update remains authoritative until the remote profile is configured */
  }
  return updated;
}

export async function updateAuthUserEmail(userId: string, nextEmail: string) {
  assertOwner();
  const email = nextEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  const users = getUsers();
  const user = users.find(entry => entry.id === userId);
  if (!user) throw new Error("User account could not be found.");
  if (user.role === "Owner")
    throw new Error(
      "The Owner email must be changed in the primary account settings."
    );
  if (
    users.some(
      entry => entry.id !== userId && entry.email.toLowerCase() === email
    )
  )
    throw new Error("A user with this email already exists.");
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token && !userId.startsWith("user-")) {
      const response = await fetch("/api/rbac/user-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.message || "Authentication email could not be updated."
        );
      setUsers(
        users.map(entry => (entry.id === userId ? { ...entry, email } : entry))
      );
      return { ...user, email, synced: true };
    }
  } catch (cause) {
    if (cause instanceof Error) throw cause;
    throw new Error("Authentication email could not be updated.");
  }
  setUsers(
    users.map(entry => (entry.id === userId ? { ...entry, email } : entry))
  );
  return { ...user, email, synced: false };
}

export async function removeUser(userId: string) {
  assertOwner();
  const user = getUsers().find(entry => entry.id === userId);
  if (!user) return { revoked: false, reason: "User was already removed." };
  if (user.role === "Owner")
    throw new Error("The Owner account cannot be removed.");
  setUsers(getUsers().filter(entry => entry.id !== userId));
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token && !userId.startsWith("user-")) {
      const response = await fetch(
        `/api/rbac/user?userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const payload = await response.json().catch(() => ({}));
      return response.ok
        ? { revoked: true, reason: payload.message || "Remote access revoked." }
        : {
            revoked: false,
            reason:
              payload.message ||
              "User removed locally; remote revocation is unavailable.",
          };
    }
  } catch {
    /* local-first removal remains authoritative until the remote profile is configured */
  }
  return {
    revoked: false,
    reason: "User removed locally; remote Supabase access was not configured.",
  };
}

export type SupabaseProfileRow = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  is_active?: boolean | null;
  created_at?: string | null;
};

export function mapSupabaseProfilesToAuthUsers(
  profiles: SupabaseProfileRow[]
): AuthUser[] {
  return profiles
    .filter(profile => profile.id && profile.email && profile.role)
    .map(profile => ({
      id: profile.id,
      email: profile.email,
      displayName: profile.full_name || profile.email,
      role: normalizeUserRole(profile.role),
      active: profile.is_active !== false,
      createdAt: profile.created_at || new Date().toISOString().slice(0, 10),
      authProvider: "supabase",
    }));
}

export async function hydrateManagedUsers() {
  const localUsers = getUsers();
  if (supabaseUrl && supabaseAnonKey) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,is_active,created_at");
    if (!error && profiles) {
      const remoteUsers = mapSupabaseProfilesToAuthUsers(
        profiles as SupabaseProfileRow[]
      );
      const remoteIds = new Set(remoteUsers.map(user => user.id));
      const pendingLocal = localUsers.filter(
        user => user.id.startsWith("user-") && !remoteIds.has(user.id)
      );
      setUsers([...remoteUsers, ...pendingLocal]);
      return getUsers();
    }
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return localUsers;
  try {
    const response = await fetch("/api/rbac/users", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) return localUsers;
    const remoteUsers = (await response.json()) as AuthUser[];
    const remoteIds = new Set(remoteUsers.map(user => user.id));
    const pendingLocal = localUsers.filter(
      user => user.id.startsWith("user-") && !remoteIds.has(user.id)
    );
    setUsers([...remoteUsers, ...pendingLocal]);
    return getUsers();
  } catch {
    return localUsers;
  }
}
