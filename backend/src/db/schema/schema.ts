import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const zodiacEnum = pgEnum('zodiac', [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]);

export const connectionTypeEnum = pgEnum('connection_type', [
  'friend',
  'casual',
  'booty_call',
  'foodie_call',
  'figuring_it_out',
  'serious',
  'other',
]);

export const dateStatusEnum = pgEnum('date_status', [
  'planned',
  'confirmed',
  'completed',
  'cancelled',
]);

export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);

export const interactionTypeEnum = pgEnum('interaction_type', ['date', 'text', 'call', 'other']);

export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  location: text('location').notNull(),
  photoUrl: text('photo_url'),
  age: integer('age'),
  birthday: text('birthday'),
  zodiac: zodiacEnum('zodiac'),
  phoneNumber: text('phone_number'),
  instagram: text('instagram'),
  tiktok: text('tiktok'),
  twitterX: text('twitter_x'),
  facebook: text('facebook'),
  interestLevel: integer('interest_level'),
  attractiveness: integer('attractiveness'),
  sexualChemistry: integer('sexual_chemistry'),
  communication: integer('communication'),
  overallChemistry: integer('overall_chemistry'),
  consistency: integer('consistency'),
  emotionalAvailability: integer('emotional_availability'),
  datePlanning: integer('date_planning'),
  alignment: integer('alignment'),
  connectionType: connectionTypeEnum('connection_type'),
  connectionTypeCustom: text('connection_type_custom'),
  favoriteFoods: text('favorite_foods').array(),
  hobbies: text('hobbies').array(),
  redFlags: text('red_flags').array(),
  greenFlags: text('green_flags').array(),
  isBenched: boolean('is_benched').default(false).notNull(),
  benchReason: text('bench_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dates = pgTable('dates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  location: text('location'),
  dateTime: text('date_time'),
  budget: text('budget'),
  status: dateStatusEnum('status').default('planned').notNull(),
  reminder3Days: boolean('reminder_3_days').default(false).notNull(),
  reminder1Day: boolean('reminder_1_day').default(false).notNull(),
  reminder1Hour: boolean('reminder_1_hour').default(false).notNull(),
  notes: text('notes'),
  rating: integer('rating'),
  wentWell: text('went_well'),
  wentPoorly: text('went_poorly'),
  wantAnotherDate: boolean('want_another_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const safetyCheckins = pgTable('safety_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  dateLocation: text('date_location'),
  personDescription: text('person_description'),
  emergencyContacts: text('emergency_contacts').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: chatRoleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  type: interactionTypeEnum('type').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  age: integer('age'),
  birthday: text('birthday'),
  zodiac: text('zodiac'),
  location: text('location'),
  occupation: text('occupation'),
  bio: text('bio'),
  favoriteFoods: text('favorite_foods').array(),
  hobbies: text('hobbies').array(),
  whatIBring: text('what_i_bring').array(),
  thingsToWorkOn: text('things_to_work_on').array(),
  greenFlags: text('green_flags').array(),
  redFlags: text('red_flags').array(),
  attractivenessSelf: integer('attractiveness_self'),
  communicationSelf: integer('communication_self'),
  instagram: text('instagram'),
  tiktok: text('tiktok'),
  twitterX: text('twitter_x'),
  phoneNumber: text('phone_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shareTokens = pgTable('share_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  notificationsEnabled: boolean('notifications_enabled').default(true).notNull(),
  darkModeEnabled: boolean('dark_mode_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
