import { eq } from "drizzle-orm"
import { db } from "../drizzle/db"
import { Admin } from "../drizzle/schema"
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

export const startTime = async () => {
    try {
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

        const startingTime = new Date();

        const result = await db.update(GameConfig)
            .set({ isStarted: true, startTime: startingTime })
            .returning({ duration: GameConfig.duration })

        if (result.length == 0) throw new apiError(500, "Game Not Started", "Something went wrong while starting the game")

        await client.set('game:isStarted', 'true')
        await client.set('game:duration', String(result[0]?.duration))
        await client.set('game:startTime', String(startingTime.getTime()))

        await client.del('group:registered')

        Yes, a Bull Queue is the right approach.Schedule it to run at startTime + duration, set isStarted = false automatically in the db.

        const data = { gameStarted: true, gameDuration: result[0]?.duration, gameStartTime: startingTime };
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