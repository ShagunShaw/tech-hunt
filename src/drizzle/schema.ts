import { pgTable, serial, varchar, pgEnum, timestamp, jsonb, smallint, boolean, numeric, text, integer, point } from "drizzle-orm/pg-core"
import { it } from "zod/locales"

export const roleEnum= pgEnum('role', ['admin', 'superAdmin'])
export const yearEnum= pgEnum('year', ['1st', '2nd', '3rd', '4th', '5th'])
export const statusEnum= pgEnum('status', ['pending', 'approved', 'rejected'])
export const groupStatusEnum= pgEnum('groupStatus', ['active', 'disqualified', 'aborted'])
export const genreEnum= pgEnum('genre', ['Earth', 'Stars', 'Sun', 'Sky'])
export const domainEnum= pgEnum('domain', ['DSA', 'Web', 'AI/ML', 'Cybersecurity', 'Cloud & Devops', 'BlockChain'])

Assign proper theme values to this 'theme' enum. (Shyd yh naa lge, coz now instead of hard-coding the themes we are letting admins only to create the theme, so phle routes and controllers bnn jane do, then decide isko rkhna h ki ni)
export const themeEnum= pgEnum('theme', ['Theme 1', 'Theme 2', 'Theme 3', 'Theme 4', 'Theme 5', 'Theme 6'])

// pgEnum expects string values for enum members
export const levelEnum= pgEnum('level', ['0', '1', '2', '3', '4', '5', '6'])        // 6 is my final stage, i.e. when a group reached 6th level that means their all levels are cleared and they will be naviagated back to the game arena i.e the auditorium, by a message


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
Don't forget to add the initial value of this table directly inside the db (id: auto, startTime: null initially (will be ristered when admin starts the game), isStarted: false initially, duration: 2hr (convert it into seconds, then add) initially )
export const GameConfig = pgTable('game_config', {
    id: serial().primaryKey(),
    startTime: timestamp(),
    isRunning: boolean().default(false),
    duration: smallint().notNull()          // (in seconds)
})

Add the Hints part also in questions (and penalties also, if not configured anywhere, but I think its configured at point.constant.ts file, just we need to implement it, check it once)
export const Question = pgTable('question', {
    id: serial().primaryKey(),
    question: text().notNull(),
    answer: varchar('answer', { length: 50 }).array().notNull(),  
    domain: domainEnum().notNull()
})

export const Theme = pgTable('theme', {
    id: serial().primaryKey(),
    name: varchar({length: 50}).notNull().unique(),
    messagesOrder: integer().array(),      // will store array of message's id from the message table in sequence 
    questionOrder: integer().array()       // if the array is [52, 31, 10, 23, 11] that means DSA question id is 52, web ques id is 31, etc. from the same table (but then how will be distribute question of each domain to each theme if all questions are in the same table) 
})

Remove the below comment later, once you are done building that part:
// Okk now coming to the questions table, we will store questions of all domains in one table only, at time of Promise.all(), we will run parallel tasks for DSA, Web, etc. Assign each question to each theme from each domain and that will be stored in our questionOrder. Now how to ensure, that question in the array appear in the same order as we had decided, like DSA -> Web -> ...    to ensure that we initially create a redis cache and insert all values to it like if its Web, then assign that question to arr[1], of its blockcain, then at arr[5], and once all the arr get filled, we will insert in our table, so that at the game time, backend just need to fetch row where question.id = x , where x is arr[y], where y is the stage they are currentl in

export const ThemeMessage = pgTable('theme_message', {
    id: serial().primaryKey(),
    // theme: smallint().notNull().references(() => Group.id, { onDelete: 'cascade' }),
    theme: smallint().notNull().references(() => Theme.id, { onDelete: 'cascade' }),
    message: text().notNull()
})



// Generate — creates the SQL migration files from your schema changes. Just files, nothing applied to DB yet.
// Migrate — takes those generated files and actually runs them on your database. This is when your DB actually changes.

// now to migrate this thing we have to run: 'npx drizzle-kit generate:pg' , but for simplicity we wrote this command in our package.json in the scripts