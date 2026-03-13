import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During build time on Vercel, these might be missing. 
// We provide placeholders to prevent createClient from throwing an error.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('Supabase credentials missing. Persistent storage will be disabled.');
  }
}

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

export async function fetchBots(userId: string): Promise<Bot[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function createBot(bot: Partial<Bot>) {
  const { data, error } = await supabase
    .from('bots')
    .insert(bot)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateBot(id: string, updates: Partial<Bot>) {
  const { data, error } = await supabase
    .from('bots')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteBot(id: string) {
  const { error } = await supabase
    .from('bots')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}

export async function fetchConversations(email: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function createConversation(conversation: Partial<Conversation>) {
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}
