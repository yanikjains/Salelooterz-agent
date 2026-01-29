import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { conversations, messages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
}

// In-memory implementation for chat to avoid Neon endpoint disabled error
class ChatMemStorage implements IChatStorage {
  private conversations: Map<number, typeof conversations.$inferSelect>;
  private messages: Map<number, typeof messages.$inferSelect>;
  private convIdCounter: number;
  private msgIdCounter: number;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.convIdCounter = 1;
    this.msgIdCounter = 1;
  }

  async getConversation(id: number) {
    return this.conversations.get(id);
  }

  async getAllConversations() {
    return Array.from(this.conversations.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createConversation(title: string) {
    const id = this.convIdCounter++;
    const conversation = { id, title, createdAt: new Date() };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async deleteConversation(id: number) {
    this.conversations.delete(id);
    const msgIds = Array.from(this.messages.values())
      .filter(m => m.conversationId === id)
      .map(m => m.id);
    msgIds.forEach(mid => this.messages.delete(mid));
  }

  async getMessagesByConversation(conversationId: number) {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(conversationId: number, role: string, content: string) {
    const id = this.msgIdCounter++;
    const message = { id, conversationId, role, content, createdAt: new Date() };
    this.messages.set(id, message);
    return message;
  }
}

export const chatStorage: IChatStorage = new ChatMemStorage();
