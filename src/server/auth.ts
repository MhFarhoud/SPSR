import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import type { User } from "../types";
import { db } from "./db";

const sessions = new Map<string, string>();
const COOKIE_NAME = "spsr_session";

function getSessionToken(req: Request): string | undefined {
  const cookie = req.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`));
  return cookie?.slice(COOKIE_NAME.length + 1);
}

export function createSession(userId: string): string {
  const token = randomUUID();
  sessions.set(token, userId);
  return token;
}

export function getSessionUser(req: Request): User | undefined {
  const token = getSessionToken(req);
  const userId = token ? sessions.get(token) : undefined;
  return userId ? db.data.users.find(user => user.id === userId && user.isActive !== false) : undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax`);
}

export function clearSession(req: Request, res: Response): void {
  const token = getSessionToken(req);
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}
