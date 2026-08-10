const USERS_KEY = "apex_users";
const ACTIVE_USER_KEY = "apex_active_user";

export interface User {
  id: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getActiveUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setActiveUser(user: User): void {
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
}

export function createUser(name: string): User {
  const users = getUsers();
  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  setActiveUser(user);
  return user;
}

export function switchUser(id: string): User | null {
  const users = getUsers();
  const user = users.find((u) => u.id === id) || null;
  if (user) setActiveUser(user);
  return user;
}

export function deleteUser(id: string): void {
  const users = getUsers().filter((u) => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const active = getActiveUser();
  if (active?.id === id) {
    localStorage.removeItem(ACTIVE_USER_KEY);
    if (users.length > 0) setActiveUser(users[0]);
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "default";
  const user = getActiveUser();
  return user ? `user-${user.id}` : "default";
}