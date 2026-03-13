"use server";

import { db, bots, conversations, profiles } from '../drizzle';
import { eq, desc } from 'drizzle-orm';

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  avatar_id: string;
  voice_id: string;
  openclaw_url: string;
  gateway_token: string;
  session_key: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_email: string;
  bot_name: string;
  bot_avatar: string;
  agent_id: string;
  status: string;
  duration: string;
  transcript: any[];
  created_at: string;
}

// Bot Actions
export async function fetchBotsAction(userId: string): Promise<Bot[]> {
  const data = await db
    .select()
    .from(bots)
    .where(eq(bots.user_id, userId))
    .orderBy(desc(bots.created_at));
    
  return data.map((bot: any) => ({
    ...bot,
    user_id: bot.user_id || '',
    avatar_id: bot.avatar_id || '',
    voice_id: bot.voice_id || '',
    openclaw_url: bot.openclaw_url || '',
    gateway_token: bot.gateway_token || '',
    session_key: bot.session_key || '',
    created_at: bot.created_at?.toISOString() || '',
    updated_at: bot.updated_at?.toISOString() || '',
  })) as Bot[];
}

export async function createBotAction(bot: Partial<Bot>) {
  const [data] = await db
    .insert(bots)
    .values({
      user_id: bot.user_id,
      name: bot.name!,
      avatar_id: bot.avatar_id,
      voice_id: bot.voice_id,
      openclaw_url: bot.openclaw_url,
      gateway_token: bot.gateway_token,
      session_key: bot.session_key,
    })
    .returning();
    
  return {
    ...data,
    created_at: data.created_at?.toISOString(),
    updated_at: data.updated_at?.toISOString(),
  };
}

export async function updateBotAction(id: string, updates: Partial<Bot>) {
  const { created_at, id: botId, ...filteredUpdates } = updates;

  const [data] = await db
    .update(bots)
    .set({ 
      ...filteredUpdates, 
      updated_at: new Date() 
    } as any)
    .where(eq(bots.id, id))
    .returning();
    
  return {
    ...data,
    created_at: data.created_at?.toISOString(),
    updated_at: data.updated_at?.toISOString(),
  };
}

export async function deleteBotAction(id: string) {
  await db
    .delete(bots)
    .where(eq(bots.id, id));
}

// Conversation Actions
export async function fetchConversationsAction(email: string): Promise<Conversation[]> {
  const data = await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_email, email))
    .orderBy(desc(conversations.created_at));
    
  return data.map((conv: any) => ({
    ...conv,
    user_email: conv.user_email || '',
    bot_name: conv.bot_name || '',
    bot_avatar: conv.bot_avatar || '',
    agent_id: conv.agent_id || '',
    status: conv.status || '',
    duration: conv.duration || '',
    transcript: (conv.transcript as any[]) || [],
    created_at: conv.created_at?.toISOString() || '',
  })) as Conversation[];
}

export async function createConversationAction(conversation: Partial<Conversation>) {
  const [data] = await db
    .insert(conversations)
    .values({
      user_email: conversation.user_email,
      bot_name: conversation.bot_name,
      bot_avatar: conversation.bot_avatar,
      agent_id: conversation.agent_id,
      status: conversation.status,
      duration: conversation.duration,
      transcript: conversation.transcript,
    })
    .returning();
    
  return {
    ...data,
    created_at: data.created_at?.toISOString(),
  };
}

export async function deleteConversationAction(id: string) {
  await db
    .delete(conversations)
    .where(eq(conversations.id, id));
}

// User/Profile Actions
export async function syncUserAction(email: string) {
  const [data] = await db
    .insert(profiles)
    .values({ email })
    .onConflictDoUpdate({
      target: profiles.email,
      set: { email } 
    })
    .returning();
    
  return {
    ...data,
    created_at: data.created_at?.toISOString(),
  };
}

export async function getLastConfigAction(email: string) {
  const [data] = await db
    .select({ last_config: profiles.last_config })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
    
  return data?.last_config;
}

export async function updateLastConfigAction(email: string, config: any) {
  await db
    .update(profiles)
    .set({ last_config: config })
    .where(eq(profiles.email, email));
}
