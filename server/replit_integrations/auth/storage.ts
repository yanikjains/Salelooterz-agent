import { type User, type UpsertUser } from "@shared/models/auth";
import { storage } from "../../storage";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const user = await storage.getUser(id);
    if (!user) return undefined;
    return {
      ...user,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      updatedAt: user.createdAt,
    } as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id!;
    const username = userData.firstName
      ? `${userData.firstName}${userData.lastName ? userData.lastName : ""}`.replace(/\s+/g, "").slice(0, 20)
      : (userData.email?.split("@")[0] || id).slice(0, 20);

    const user = await storage.upsertUserWithId(id, username, userData.email || null);

    return {
      ...user,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      updatedAt: new Date(),
    } as User;
  }
}

export const authStorage = new AuthStorage();
