import * as z from 'zod'
import type { genreSchema } from '../validations/tokenUser.type'
import client from '../redis.config'
import { apiError } from '../utils/ApiError'
import { db } from "../drizzle/db"
import { Group, GroupMember, Theme } from '../drizzle/schema'
import { inArray, eq, and } from 'drizzle-orm'
import logger from '../logger'

type GenreType = z.infer<typeof genreSchema>;

export const RoundRobin = async () => {
    try {

        // Atomically increment the counter (starts at 1 on first call)
        const currentCount = await client.incr('theme:count');      // the 'incr' instead of 'get' wil help us prevent the race condition in our 'round robin' case 

        const themeIndex = ((currentCount - 1) % 6) + 1;

        let themeName = await client.get(`theme:number:${themeIndex}`);
        let index = await client.get(`theme:index:${themeIndex}`)

        if (!themeName || !index) {
            const themes = await db.select({ name: Theme.name, id: Theme.id }).from(Theme);

            if (!themes || themes.length === 0) {
                throw new apiError(500, "Unable to fetch Themes", "Problem fetching themes from DB");
            }

            // Cache all themes in Redis concurrently
            const cachePromises: Promise<any>[] = [];
            for (let i = 0; i < themes.length; i++) {
                if (typeof themes[i]?.name === 'string' && themes[i]?.id) {

                    cachePromises.push(client.set(`theme:number:${i + 1}`, String(themes[i]?.name)));
                    cachePromises.push(client.set(`theme:index:${i + 1}`, String(themes[i]?.id)));
                }
            }
            await Promise.all(cachePromises);

            themeName = await client.get(`theme:number:${themeIndex}`);
            index = await client.get(`theme:index:${themeIndex}`);

            if (!themeName) {
                throw new apiError(404, "Not Found", `Theme for position ${themeIndex} is missing`);
            }

            if (!index) {
                throw new apiError(404, "Not Found", `Theme index for position ${themeIndex} is missing`);
            }
        }

        return { themeName, index };
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

export const createGroup = async (groupName: string, userId: number) => {
    try {
        const result = await client.sAdd('group:registered', groupName.toLowerCase())
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

            throw new apiError(410, "Group Expired", "Group already expired, create a new group and retry again")
        }

        if (groupName === "unknown") {
            throw new apiError(410, "Group Expired", "Group already expired, create a new group and retry again")
        }

        await client.sAdd(`group:member:${normalizedGroupId}`, String(userId))

        if (await client.sCard(`group:member:${normalizedGroupId}`) == 4)        // to get the length of the value array
        {
            const arr = await client.sMembers(`group:member:${normalizedGroupId}`)

            const themeAssigned = await RoundRobin();
            const genres = await Promise.all(arr.map(id => client.get(`genre:${id}`)))
            if (genres.some(g => g === null)) throw new apiError(500, "Genre Missing", "Genre of one/more then one candidate is missing, might be because they are already a part of any other group")

            const uniqueGenres = new Set([genres[0], genres[1], genres[2], genres[3]]);
            if (uniqueGenres.size < 4) {
                throw new apiError(400, "Duplicate Genres", "One or more genres of the group members are same, cant form group")
            }

            // DB Transaction
            const responseData = await db.transaction(async (tx) => {

                const result = await tx.insert(Group)
                    .values({ name: groupName, themeAssigned: themeAssigned.themeName })
                    .returning({ id: Group.id });

                if (result.length === 0) {
                    throw new apiError(500, "Something went wrong", "Something went wrong while creating the group")
                }

                const newGroupId = Number(result[0]?.id);
                await client.set(`theme:${newGroupId}`, String(themeAssigned.index))

                await tx.insert(GroupMember).values([
                    { participantId: Number(arr[0]), genre: genres[0], groupId: newGroupId },
                    { participantId: Number(arr[1]), genre: genres[1], groupId: newGroupId },
                    { participantId: Number(arr[2]), genre: genres[2], groupId: newGroupId },
                    { participantId: Number(arr[3]), genre: genres[3] as any, groupId: newGroupId }
                ]);

                logger.info("groupCreated", {
                    groupName: groupName,
                    groupId: newGroupId,
                    groupType: "Normal",        
                    groupMembers: arr,
                    respectiveGenres: genres,
                    timestamp: new Date()
                })

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
            logger.info("groupAborted", {
                groupId: result[0]?.id,
                timestamp: new Date()
            })

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

export const getAllGroups = async (page: any, limit: any) => {
    try {
        if (!page || !limit) throw new apiError(422, "Invalid URL format", "'page' and 'limit' is missing in route")

        const page_value = Number(page) || 1
        const limit_value = Number(limit) || 10
        const offset = (page_value - 1) * limit_value

        const result = await db.select()
            .from(Group)
            .limit(limit_value)
            .offset(offset)

        const finalResult = { data: result, pagination: { page: page_value, limit: limit_value, total: result.length } }

        return finalResult;
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