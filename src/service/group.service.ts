when the TTL for a creating a group has expired and all members are not added to it, then how will all the members(who has been added in the group till now) and the group lead will be notified about it in frontend and will be asked to create another group

import * as z from 'zod'
import type { genreSchema } from '../validations/tokenUser.type'
import client from '../redis.config'
import { apiError } from '../utils/ApiError'
import { db } from "../drizzle/db"
import { Group, GroupMember } from '../drizzle/schema'
import { inArray, eq, and } from 'drizzle-orm'

type GenreType = z.infer<typeof genreSchema>;

export const registerGenre = async (genre: GenreType, userId: number) => {
    try {
        const existing = await client.exists(`genre:${userId}`)
        if (existing) throw new apiError(400, "Already Registered", "You have already registered your genre")

        await client.set(`genre:${userId}`, genre)
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

Check Type checkign for redis values: Number are treated as String
export const createGroup = async (groupName: string, userId: number) => {
    try {
        const result = await client.sAdd('group:registered', groupName)
        if (!result) throw new apiError(409, "Group Name reserved", "This group name is already taken, try something else")

        // create and add the req.user in the group
        const uniqueId = crypto.randomUUID().split('-')[0]           // e.g. fa5e2da3
        await client.set(`group:${uniqueId}`, groupName, { EX: 90 })

        await client.sAdd(`group:member:${uniqueId}`, String(userId))
        await client.expire(`group:member:${uniqueId}`, 60);

        return { uniqueId }
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

export const joinGroup = async (groupId: string, userId: number) => {
    try {
        const normalizedGroupId = groupId.toLowerCase()

        const keyExists = await client.exists(`group:member:${normalizedGroupId}`)
        const groupName = await client.get(`group:${normalizedGroupId}`) || 'unknown'

        if (!keyExists) {
            await client.sRem('group:registered', groupName)

            throw new apiError(410, "Group Expired", "Group already expired, retry again")
        }

        if (groupName === "unknown") {
            throw new apiError(410, "Group Expired", "Group already expired, retry again")
        }

        await client.sAdd(`group:member:${normalizedGroupId}`, String(userId))

        if (await client.sCard(`group:member:${normalizedGroupId}`) == 4)        // to get the length of the value array
        {
            const arr = await client.sMembers(`group:member:${normalizedGroupId}`)

            evenly distribute themes across all groups(using round robin algorithm(a good way of doing this is that we take the group number like 1st group, 2nd group like this, that is being stored in redis and apply mod 6 to the group number, and then assign theme[at that number]to that group, and increase the group number count in redis by 1))
            const themeAssigned = 'Theme 1'
            const genres = await Promise.all(arr.map(id => client.get(`genre:${id}`)))
            if (genres.some(g => g === null)) throw new apiError(500, "Genre Missing", "Genre of one/more then one candidate is missing, might be because they are already a part of any other group")

            const uniqueGenres = new Set([genres[0], genres[1], genres[2], genres[3]]);
            if (uniqueGenres.size < 4) {
                throw new apiError(400, "Duplicate Genres", "One or more genres of the group members are same, cant form group")
            }

            // DB Transaction
            const responseData = await db.transaction(async (tx) => {

                const result = await tx.insert(Group)
                    .values({ name: groupName, themeAssigned })
                    .returning({ id: Group.id });

                if (result.length === 0) {
                    throw new apiError(500, "Something went wrong", "Something went wrong while inserting the data")
                }

                const newGroupId = Number(result[0]?.id);

                await tx.insert(GroupMember).values([
                    { participantId: Number(arr[0]), genre: genres[0], groupId: newGroupId },
                    { participantId: Number(arr[1]), genre: genres[1], groupId: newGroupId },
                    { participantId: Number(arr[2]), genre: genres[2], groupId: newGroupId },
                    { participantId: Number(arr[3]), genre: genres[3] as any, groupId: newGroupId }
                ]);

                return {
                    createdGroupId: newGroupId,
                    groupName,
                    themeAssigned
                };
            });

            // redis cleanup
            for (let i = 0; i < 4; i++)    await client.del(`genre:${arr[i]}`)
            await client.del(`group:${normalizedGroupId}`)
            await client.del(`group:member:${normalizedGroupId}`)

            return { status: 201, responseData: responseData }
        }

        return { status: 200, responseData: {} }
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

export const abortGroup = async (userId: number, groupId: number) => {
    try {
        const result = await db.update(Group)
            .set({ status: 'aborted' })
            .where(
                inArray(Group.id, (         // subqueries k liye we use 'inArray' instead of 'eq'
                    db.select({ groupId: GroupMember.groupId })
                        .from(GroupMember)
                        .where(
                            and(
                                eq(GroupMember.participantId, userId),
                                eq(GroupMember.groupId, groupId)
                            )
                        )
                )
                )
            )
            .returning({ id: Group.id })

        if (result.length == 0) return { success: false }   
        else {
            await client.sAdd('groups:aborted', String(groupId))
            return { success: true }
        } 

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