import { pgTable, serial, varchar, pgEnum, timestamp, jsonb, smallint, boolean, numeric } from "drizzle-orm/pg-core"
import { it } from "zod/locales"

export const roleEnum= pgEnum('role', ['admin', 'superAdmin'])
export const yearEnum= pgEnum('year', ['1st', '2nd', '3rd', '4th', '5th'])
export const statusEnum= pgEnum('status', ['pending', 'approved', 'rejected'])
export const groupStatusEnum= pgEnum('groupStatus', ['active', 'disqualified', 'aborted'])
export const genreEnum= pgEnum('genre', ['Earth', 'Stars', 'Sun', 'Sky'])

Assign proper theme values to this 'theme' enum
export const themeEnum= pgEnum('theme', ['Theme 1', 'Theme 2', 'Theme 3', 'Theme 4', 'Theme 5', 'Theme 6'])

// pgEnum expects string values for enum members
export const levelEnum= pgEnum('level', ['0', '1', '2', '3', '4'])


export const Participant = pgTable('participant', {
    id: serial().primaryKey(),      // auto_increment by default
    name: varchar({length: 50}).notNull(),
    email: varchar({length: 70}).unique().notNull(),
    googleId: varchar({length: 21}).unique().notNull(),
    phone: varchar({length: 10}),
    college: varchar({length: 100}),
    department: varchar({length: 50}),
    year: yearEnum(),
    refreshTokens: jsonb().$type<{sessionId: string, token: string}[]>().default([]),
    created_at: timestamp().defaultNow()
})

export const Admin = pgTable('admin', {
    id: serial().primaryKey(),      // check if you can start the value from 1000 or not
    name: varchar({length: 50}).notNull(),
    email: varchar({length: 70}).unique().notNull(),
    googleId: varchar({length: 21}).unique().notNull(),
    phone: varchar({length: 10}),
    role: roleEnum().notNull(),
    description: varchar({length: 300}).notNull(),
    status: statusEnum().default('pending'),
    refreshTokens: jsonb().$type<{sessionId: string, token: string}[]>().default([]),
    created_at: timestamp().defaultNow()
})

export const Group = pgTable('group', {
    id: serial().primaryKey(),
    name: varchar({length: 50}).notNull(),
    status: groupStatusEnum().default('active'),
    points: smallint().default(20),     
    timeTaken: numeric({ precision: 5, scale: 2 }).default('0.00'),          // in minutes
    createdAt: timestamp().defaultNow(),
    maxLevelReached: levelEnum().default('0'),
    themeAssigned: themeEnum().notNull()            
})

// See the process of assigning genre to each member in notes.txt file
export const GroupMember = pgTable('group_member', {
    id: serial().primaryKey(),
    participantId: smallint().notNull().unique().references(() => Participant.id, { onDelete: 'restrict' }),        // even admins can play can the game, but for that they had to first register, they cannot play directly from being the admin, but they can use the same email for register, the only main thing is to 'register'
    genre: genreEnum(),
    groupId: smallint().notNull().references(() => Group.id, { onDelete: 'cascade' })
})

// This table will have only one row, and its value will be created from the db itself, only the fileds will be updated from the backend services
Don't forget to add the initial value of this table directly inside the db (id: auto, startTime: null initially (will be ristered when admin starts the game), isStarted: false initially, duration: 3hr (convert it into seconds, then add) initially )
export const GameConfig = pgTable('game_config', {
    id: serial().primaryKey(),
    startTime: timestamp(),
    isStarted: boolean().default(false),
    duration: smallint().notNull()          // (in seconds)
})



// Generate — creates the SQL migration files from your schema changes. Just files, nothing applied to DB yet.
// Migrate — takes those generated files and actually runs them on your database. This is when your DB actually changes.

// now to migrate this thing we have to run: 'npx drizzle-kit generate:pg' , but for simplicity we wrote this command in our package.json in the scripts