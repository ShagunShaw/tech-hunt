import { eq } from "drizzle-orm"
import { db } from "../drizzle/db"
import { Admin, Group } from "../drizzle/schema"
import { apiError } from "../utils/ApiError"
import { GameConfig } from "../drizzle/schema";
import client from "../redis.config";


export const getAdmins = async (status: 'approved' | 'pending') => {
    try {
        const admins = await db.query.Admin.findMany({
            where: eq(Admin.status, ((status === 'pending') ? 'pending' : 'approved')),
            columns: {
                id: true,
                name: true,
                email: true,
                phone: true,
                description: true
            }
        })

        return admins;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const manageApprovalService = async (adminId: number, status: 'approved' | 'rejected') => {
    try {
        const data = await db.update(Admin)
            .set({ status: ((status === 'approved') ? 'approved' : 'rejected') })
            .where(eq(Admin.id, adminId))
            .returning({ id: Admin.id })

        if (data.length === 0) throw new apiError(404, "Entry not found", "No such entry with this admin id found")

        Send an email to the admin about their acception / rejection via Kafka's email service

        return data;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const deleteAdminService = async (adminId: number) => {
    try {
        const data = await db.delete(Admin)
            .where(eq(Admin.id, adminId))
            .returning({ id: Admin.id })

        if (data.length === 0) throw new apiError(404, "Entry not found", "No such entry with this admin id found")

        Send an email to the admin about them being removed via Kafka's email service

        return data;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const startGame = async () => {
    try {
        const val = await client.exists('game:isRunning');
        if (val) throw new apiError(400, "Cannot re-Start Game", "Cannot re-start the game as it is either running or has been ended previously")

        const iteratorParams = { MATCH: 'group:member:*', COUNT: 100 };
        for await (const key of client.scanIterator(iteratorParams)) {
            // If the loop runs even once, it means at least one record has NOT expired yet
            throw new apiError(403, "Cannot Start the Game", "There are one/some group/s which are yet to be created!")
        }

        const iteratorParams2 = { MATCH: 'genre:*', COUNT: 100 };
        for await (const key of client.scanIterator(iteratorParams2)) {
            // If the loop runs even once, it means at least one record has NOT expired yet
            throw new apiError(403, "Cannot Start the Game", "There are one/some participant/s which are yet to be assigned to a group")
        }
        // now if there is a particpant who has not joined a group but when asking in public who is he, he is not responding also, so there is a way I can look into my redis without running any code in the application (on redis CLI we will), who is that one participant. and if required we can also remove that partcipant from redis cache without any code in application but using CLI command

        before starting the game, parallelise questions assignment across 6 domains using Promise.all (agr context ni milra what is it, then ask claude, it knows about it)

        const result = await db.update(GameConfig)
            .set({ isRunning: true, startTime: new Date() })
            .returning({ duration: GameConfig.duration, startTime: GameConfig.startTime })

        if (result.length == 0) throw new apiError(500, "Game Not Started", "Something went wrong while starting the game")

        await client.set('game:isRunning', 'true')
        await client.set('game:duration', String(result[0]?.duration))
        await client.set('game:startTime', String(result[0]?.startTime))

        await client.del('group:registered')

        const data = { gameRunning: true, gameDuration: result[0]?.duration, gameStartTime: startingTime };
        return data;

    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const endGame = async () => {
    try {
        const val = await client.get('game:isRunning');
        if (!val || val === 'false') throw new apiError(400, "Cannot End Game", "Cannot end the game as it is either not started or has been ended previously")

        Also freeze the 'timeTaken' field of Groups Table, so that their timer does not continues running while the game has been ended(make this change for both auto - finish and manual finish). Although the game routes will be blocked after the duration exceeded, but their timer will continue running, need to freeze it manually.

        Also clear all records from the redis, that had been added to it, during or before the game.Dont forget to store final point and time taken for each group in the db, before clearing the redis

        const startTime = await client.get('game:startTime')
        const duration = Math.ceil((new Date().getTime() - Number(startTime)) / 1000)

        const result = await db.update(GameConfig)
            .set({ isRunning: false, duration })
            .returning({ duration: GameConfig.duration })

        if (result.length == 0) throw new apiError(500, "Game Not Ended", "Something went wrong while ending the game")

        await client.set('game:isRunning', 'false')
        await client.set('game:duration', String(result[0]?.duration))

        const data = { gameRunning: false, gameDuration: result[0]?.duration }
        return data
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const disqualifyGroup = async (groupId: any) => {
    try {
        const parsedGroupId = Number(groupId)
        if (isNaN(parsedGroupId)) {
            throw new apiError(400, "Invalid group ID", "Group ID must be a valid number")
        }

        const result = await db.update(Group)
            .set({ status: 'disqualified' })
            .where(eq(Group.id, parsedGroupId))
            .returning({ id: Group.id, status: Group.status })

        if (result.length === 0) throw new apiError(404, "Not Found", "No such group of this id is found")

        await client.sAdd('groups:disqualified', String(parsedGroupId))

        return result;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}