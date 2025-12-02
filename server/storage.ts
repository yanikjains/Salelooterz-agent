import { type User, type InsertUser, type Automation, type InsertAutomation } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(resetToken: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOrUpdateUserWithEmail(username: string, email: string): Promise<User>;
  updateUserSpreadsheet(userId: string, spreadsheetId: string): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  setResetToken(userId: string, resetToken: string, expiresIn: number): Promise<User>;
  resetPassword(resetToken: string, newPassword: string): Promise<User>;
  
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  getAutomations(userId: string, limit?: number): Promise<Automation[]>;
  getAutomationById(id: number): Promise<Automation | undefined>;
  getWeeklyProductCount(userId: string): Promise<number>;
  getDailyProductCount(userId: string): Promise<number>;
  markUserAsPaid(userId: string): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private automations: Map<number, Automation>;
  private automationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.automations = new Map();
    this.automationIdCounter = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const subscriptionEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Hash password if provided
    let hashedPassword: string | null = null;
    if (insertUser.password) {
      const bcrypt = await import("bcrypt");
      hashedPassword = await bcrypt.hash(insertUser.password, 10);
    }
    
    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      email: insertUser.email || null,
      spreadsheetId: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      isPaid: "false",
      subscriptionEndsAt,
      trialEndsAt: null,
      razorpayOrderId: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async createOrUpdateUserWithEmail(username: string, email: string): Promise<User> {
    let user = Array.from(this.users.values()).find(u => u.username === username || u.email === email);
    
    if (user) {
      user.email = email;
      this.users.set(user.id, user);
      return user;
    }

    const id = randomUUID();
    const now = new Date();
    const subscriptionEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const newUser: User = {
      id,
      username,
      password: null,
      email,
      spreadsheetId: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      isPaid: "false",
      subscriptionEndsAt,
      trialEndsAt: null,
      razorpayOrderId: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserSpreadsheet(userId: string, spreadsheetId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.spreadsheetId = spreadsheetId;
    this.users.set(userId, user);
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const id = this.automationIdCounter++;
    const automation: Automation = {
      ...insertAutomation,
      spreadsheetId: insertAutomation.spreadsheetId ?? null,
      id,
      createdAt: new Date(),
    };
    this.automations.set(id, automation);
    return automation;
  }

  async getAutomations(userId: string, limit: number = 50): Promise<Automation[]> {
    const all = Array.from(this.automations.values()).filter(a => a.userId === userId);
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  async getAutomationById(id: number): Promise<Automation | undefined> {
    return this.automations.get(id);
  }

  async getWeeklyProductCount(userId: string): Promise<number> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const userAutomations = Array.from(this.automations.values()).filter(
      a => a.userId === userId && a.createdAt >= weekAgo
    );
    
    return userAutomations.length;
  }

  async getDailyProductCount(userId: string): Promise<number> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const userAutomations = Array.from(this.automations.values()).filter(
      a => a.userId === userId && a.createdAt >= today
    );
    
    return userAutomations.length;
  }

  async markUserAsPaid(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.isPaid = "true";
    user.paidAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async getUserByResetToken(resetToken: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => {
      if (!user.resetToken || !user.resetTokenExpiry) return false;
      return user.resetToken === resetToken && user.resetTokenExpiry > new Date();
    });
  }

  async setResetToken(userId: string, resetToken: string, expiresIn: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + expiresIn);
    this.users.set(userId, user);
    return user;
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<User> {
    const user = await this.getUserByResetToken(resetToken);
    if (!user) throw new Error('Invalid or expired reset token');
    
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    this.users.set(user.id, user);
    return user;
  }
}

export const storage = new MemStorage();
