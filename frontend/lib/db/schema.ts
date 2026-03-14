import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  last_config: jsonb('last_config'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const bots = pgTable('bots', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id),
  name: text('name').notNull(),
  avatar_id: text('avatar_id'),
  voice_id: text('voice_id'),
  openclaw_url: text('openclaw_url'),
  gateway_token: text('gateway_token'),
  session_key: text('session_key'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_email: text('user_email').references(() => profiles.email),
  bot_name: text('bot_name'),
  bot_avatar: text('bot_avatar'),
  agent_id: text('agent_id'),
  status: text('status').default('Ended'),
  duration: text('duration'),
  transcript: jsonb('transcript').default([]),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
