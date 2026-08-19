import { asc, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "../drizzle/db"
import { Admin, Group, GroupMember, Question, Theme } from "../drizzle/schema"
import { apiError } from "../utils/ApiError"
import { GameConfig } from "../drizzle/schema";
import client from "../redis.config";
import { domainSchema, genreSchema } from "../validations/tokenUser.type";
import * as z from "zod";
import { EXTRA_POINTS } from "../constants/point.constant";


const assignQuestions = async () => {
    try {
        const domains = domainSchema.options;           // 'domainSchema.options' contains ['DSA', 'Web', 'AI/ML', 'Cybersecurity', 'Cloud&Devops', 'BlockChain'] from the domainSchema we defined in our zod file

        const queryPromises = domains.map(domainName =>
            db.select({ id: Question.id })
                .from(Question)
                .where(eq(Question.domain, domainName))
        );

        const [dsa, web, aiml, cyber, cloud, blockchain] = await Promise.all(queryPromises);

        if (!dsa || dsa.length === 0) throw new apiError(500, "DSA Missing", "Could not fetch dsa questions from the db")
        if (!web || web.length === 0) throw new apiError(500, "Web Missing", "Could not fetch web questions from the db")
        if (!aiml || aiml.length === 0) throw new apiError(500, "AI/ML Missing", "Could not fetch AI/ML questions from the db")
        if (!cyber || cyber.length === 0) throw new apiError(500, "CyberSecurity Missing", "Could not fetch cybersecurity questions from the db")
        if (!cloud || cloud.length === 0) throw new apiError(500, "Cloud&DevOps Missing", "Could not fetch cloud & devops questions from the db")
        if (!blockchain || blockchain.length === 0) throw new apiError(500, "Blockchain Missing", "Could not fetch blockchain questions from the db")

        if (dsa.length !== 6) throw new apiError(400, "Insufficient Questions", "DSA domain needs at least/most 6 questions")
        if (web.length !== 6) throw new apiError(400, "Insufficient Questions", "Web domain needs at least/most 6 questions")
        if (aiml.length !== 6) throw new apiError(400, "Insufficient Questions", "AI/ML domain needs at least/most 6 questions")
        if (cyber.length !== 6) throw new apiError(400, "Insufficient Questions", "CyberSecurity domain needs at least/most 6 questions")
        if (cloud.length !== 6) throw new apiError(400, "Insufficient Questions", "Cloud&Devops domain needs at least/most 6 questions")
        if (blockchain.length !== 6) throw new apiError(400, "Insufficient Questions", "Blockchain domain needs at least/most 6 questions")


        // Shuffling my question for each domain
        const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5)

        const shuffledDsa = shuffle(dsa)
        const shuffledWeb = shuffle(web)
        const shuffleAiml = shuffle(aiml)
        const shuffleCyber = shuffle(cyber)
        const shuffleCloud = shuffle(cloud)
        const shuffleBlockchain = shuffle(blockchain)


        const lists: any = [];
        for (let i = 0; i < 6; i++) {
            const temp = [];
            temp.push(shuffledDsa[i]?.id)
            temp.push(shuffledWeb[i]?.id)
            temp.push(shuffleAiml[i]?.id)
            temp.push(shuffleCyber[i]?.id)
            temp.push(shuffleCloud[i]?.id)
            temp.push(shuffleBlockchain[i]?.id)

            lists.push(temp);
        }

        const existingThemes = await db.select({ id: Theme.id }).from(Theme);

        if (existingThemes.length === 0) throw new apiError(500, "Themes not fetched", "Could not fetch themes id from the db")

        if (existingThemes.length !== 6) throw new apiError(400, "Could not start the game", "Total 6 themes are not present in the db, so cant start the game")

        await db.transaction(async (tx) => {

            const updatePromises = lists.map((arr: [], index: number) => {
                const targetTheme = existingThemes[index];

                if (targetTheme) {
                    return tx.update(Theme)
                        .set({ questionOrder: arr })
                        .where(eq(Theme.id, targetTheme.id));
                }
                return null;
            }).filter(Boolean);

            await Promise.all(updatePromises);
        });
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

        await assignQuestions();

        const result = await db.update(GameConfig)
            .set({ isRunning: true, startTime: new Date() })
            .returning({ duration: GameConfig.duration, startTime: GameConfig.startTime })

        if (result.length == 0) throw new apiError(500, "Game Not Started", "Something went wrong while starting the game")

        await client.set('game:isRunning', 'true')
        await client.set('game:duration', String(result[0]?.duration))
        await client.set('game:startTime', String(result[0]?.startTime))

        await client.del('group:registered')

        const data = { gameRunning: true, gameDuration: result[0]?.duration, gameStartTime: result[0]?.startTime };
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

export const createSpecialGroup = async (groupId: any, groupName: string) => {
    try {
        // Instead of requesting for the leftover partipants id from the frontend, we'll fetch those from the redis

        let leftUsers = [];

        const iterator = client.scanIterator({
            MATCH: 'genre:*',
            COUNT: 10        // Tells Redis to look at 10 keys per batch to remain non-blocking
        });

        for await (const key of iterator) {
            const singleKey = key as unknown as string;
            leftUsers.push(singleKey.replace("genre:", ""));
        }

        if (leftUsers.length === 0) throw new apiError(400, "No user left", "No user left in the redis whose group is yet to be formed")

        let result: any[] = [];

        if (leftUsers.length === 1) {
            if (!groupId) throw new apiError(400, "Group Id not given", "For only 1 left member, you need to add it to an existing group and thus the group Id is required")

            const parsedGroupId = Number(groupId.toLowerCase())
            if (isNaN(parsedGroupId)) {
                throw new apiError(400, "Invalid group ID", "Group ID must be a valid number")
            }

            const genre = await client.get(`genre:${leftUsers[0]}`)
            const isValid = genreSchema.safeParse(genre)
            if (!isValid.success) throw new apiError(500, "Genre Mismatch", "Provided genre does not match with any of the specified genres")

            const member = await db.insert(GroupMember)
                .values({ participantId: Number(leftUsers[0]), genre: isValid.data, groupId: parsedGroupId })
                .returning({ id: GroupMember.id, groupId: GroupMember.groupId })

            if (member.length === 0) throw new apiError(500, "Could not insert", `Something went wrong while adding the left member to the existing group id ${parsedGroupId}`)

            if (!member[0]) throw new apiError(500, "Member not found", "Member record was not created properly")

            await client.del(`genre:${leftUsers[0]}`)

            result = await db.select({ groupId: Group.id, groupName: Group.name, themeAssigned: Group.themeAssigned })
                .from(Group)
                .where(eq(Group.id, member[0].groupId))

            if (result.length === 0) throw new apiError(404, "Not Found", "No such group of the provided groupId is found")
        } else if (leftUsers.length >= 4) {
            throw new apiError(403, "Cannot Form Special Groups", `There are still ${leftUsers.length} members left to form a group out of which ${(leftUsers.length) / 4} groups can still be formed. First form those groups and then hit this route for grouping the left members (if any)`)
        } else {
            if (!groupName) throw new apiError(400, "Group Name missing", "Since there are only 2 or 3 member left to form th group, a group name is required!")

            Properly assign this theme later
            const themeAssigned = "Theme 1"
            const genres = await Promise.all(leftUsers.map(id => client.get(`genre:${id}`)))
            if (genres.some(g => g === null)) throw new apiError(500, "Genre Missing", "Genre of one/more then one candidate is missing, might be because they are already a part of any other group")
            if (genres.some(g => !genreSchema.safeParse(g).success)) throw new apiError(500, "Genre Mismatch", "Provided genre of one/more than one candidate does not match with any of the specified genres")

            // DB Transaction
            result = await db.transaction(async (tx) => {

                const result2 = await tx.insert(Group)
                    .values({ name: groupName, themeAssigned })
                    .returning({ id: Group.id });

                if (result2.length === 0) {
                    throw new apiError(500, "Something went wrong", "Something went wrong while creating the group")
                }

                const newGroupId = Number(result2[0]?.id);

                if (leftUsers.length === 2) {
                    await tx.insert(GroupMember).values([
                        { participantId: Number(leftUsers[0]), genre: genres[0] as z.infer<typeof genreSchema>, groupId: newGroupId },
                        { participantId: Number(leftUsers[1]), genre: genres[1] as z.infer<typeof genreSchema>, groupId: newGroupId },
                    ]);
                }
                else if (leftUsers.length === 3) {
                    await tx.insert(GroupMember).values([
                        { participantId: Number(leftUsers[0]), genre: genres[0] as z.infer<typeof genreSchema>, groupId: newGroupId },
                        { participantId: Number(leftUsers[1]), genre: genres[1] as z.infer<typeof genreSchema>, groupId: newGroupId },
                        { participantId: Number(leftUsers[2]), genre: genres[2] as z.infer<typeof genreSchema>, groupId: newGroupId },
                    ]);
                }

                return [{
                    groupId: newGroupId,
                    groupName,
                    themeAssigned
                }];
            });

            // Cleanup Redis records after successful transaction commit
            const redisDeleteKeys = leftUsers.map(id => `genre:${id}`);
            await client.del(redisDeleteKeys);
        }

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

export const allocateExtraPointsByLevel = async () => {
    try {
        // This 'caseChunk' will help us to allocate extra points to each groups depending upon the max level they had reached so far 
        const caseChunks = Object.entries(EXTRA_POINTS).map(
            ([level, points]) => sql`WHEN ${Group.maxLevelReached} = ${level} THEN ${points}`
        );

        const pointsToAddSql = sql`CASE ${sql.join(caseChunks, sql` `)} ELSE 0 END`;

        const result = await db.transaction(async (tx) => {
            const updated = await tx
                .update(Group)
                .set({
                    points: sql`${Group.points} + ${pointsToAddSql}`,
                })
                .where(inArray(Group.status, ['active']))
                .returning({
                    id: Group.id,
                    maxLevelReached: Group.maxLevelReached,
                    newPoints: Group.points
                });

            if (updated.length === 0) {
                throw new apiError(
                    404,
                    "No Groups Updated",
                    "No groups currently match 'active' or 'cleared' status"
                );
            }

            return updated;
        });

        return result;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred during points allocation"
        );
    }
};

export const getResults = async () => {
    try {
        const isRunning = await client.get('game:isRunning')

        // !isRunning means game not started yet and isRunning === 'true' means game is running currently, so cant give the results
        if (!isRunning || isRunning === 'true') throw new apiError(400, "Can not give results", "The game is either running or has not started yet, so cant give the results")

        const groups = await db.select({ id: Group.id, name: Group.name, points: Group.points, timeTaken: Group.timeTaken, theme: Group.themeAssigned })
            .from(Group)
            .where(eq(Group.status, 'cleared'))
            .orderBy(desc(Group.points), asc(Group.timeTaken))    // Sorts by points (highest first). If points are equal, sorts by timeTaken (lowest/fastest first)

        if (groups.length === 0) throw new apiError(400, "Cant calculate results", "Cant calculate the results as there are no groups who had cleared all the levels by the end of the game")

        return groups;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred during points allocation"
        );
    }
}