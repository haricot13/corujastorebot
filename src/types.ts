export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  stock: number;
  imageUrl?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string; // HH:MM format or ISO
  status?: 'sent' | 'delivered' | 'read';
}

export interface Trigger {
  id: string;
  keyword: string;
  reply: string;
  isRegex: boolean;
  isActive: boolean;
  category: string;
}

export interface LogEntry {
  id: string;
  timestamp: string; // HH:MM:SS format
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

export interface BotStats {
  messagesSent: number;
  activeChats: number;
  avgResponseTime: number; // in seconds
  conversionRate: number; // percentage
}
