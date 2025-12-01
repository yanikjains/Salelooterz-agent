import { type User, type InsertUser, type Automation, type InsertAutomation } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOrUpdateUserWithEmail(username: string, email: string): Promise<User>;
  updateUserSpreadsheet(userId: string, spreadsheetId: string): Promise<User>;
  
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, spreadsheetId: null, isPaid: "false", paidAt: null, email: null, createdAt: new Date(), password: insertUser.password || null };
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
    const newUser: User = { id, username, password: null, email, spreadsheetId: null, isPaid: "false", paidAt: null, createdAt: new Date() };
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
}

export const storage = new MemStorage();
