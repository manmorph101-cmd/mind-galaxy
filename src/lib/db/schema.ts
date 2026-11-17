import { pgTable, text, real, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

export const nodes = pgTable('nodes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      text('user_id').notNull(),
  label:       text('label').notNull(),
  category:    text('category').notNull(),
  type:        text('type').notNull(),
  color:       text('color').notNull(),
  description: text('description'),
  x:           real('x').notNull().default(0),
  y:           real('y').notNull().default(0),
  progress:    integer('progress').notNull().default(0),
  done:        boolean('done').notNull().default(false),
  xp:          integer('xp').notNull().default(0),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const edges = pgTable('edges', {
  id:     uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  fromId: text('from_id').notNull(),
  toId:   uuid('to_id').references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  offset: real('offset').notNull().default(0),
})

export const progressLogs = pgTable('progress_logs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').notNull(),
  nodeId:    uuid('node_id').references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  xpGained:  integer('xp_gained').notNull().default(10),
  note:      text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Node = typeof nodes.$inferSelect
export type NewNode = typeof nodes.$inferInsert
export type Edge = typeof edges.$inferSelect
export type NewEdge = typeof edges.$inferInsert
