import { users, type User, type UpsertUser } from "@shared/models/auth";
import { storage } from "../../storage";
import { eq } from "drizzle-orm";

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
    const existing = await storage.getUser(userData.id!);
    if (existing) {
      const updated = await storage.updateUser(userData.id!, {
        email: userData.email,
      });
      return {
        ...updated,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        updatedAt: new Date(),
      } as User;
    }
    
    const user = await storage.createUser({
      username: userData.email?.split('@')[0] || userData.id!,
      email: userData.email || null,
      password: null,
    });
    
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
