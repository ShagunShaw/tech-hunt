import { db } from "../drizzle/db";
import { Group, Question, Theme, ThemeMessage } from "../drizzle/schema";
import client from "../redis.config";
import { apiError } from "../utils/ApiError";
import type { Request, Response } from 'express'
import { eq, sql } from "drizzle-orm";
import { apiResponse } from "../utils/ApiResponse";
import { POINTS } from "../constants/point.constant";
import { levelSchema } from "../validations/tokenUser.type";
import * as z from "zod";

export const scanStartQR = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params
        const assignedThemeId = await client.get(`theme:${groupId}`)

        if (!assignedThemeId) throw new apiError(500, "Redis Fetching Error", "Could not fetch the assigned theme for this group")

        let result: any = await client.get(`theme:${assignedThemeId}:message:1`)
        if (!result) {
            const parsedThemeId = Number(assignedThemeId)

            if (isNaN(parsedThemeId)) {
                throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
            }

            result = await db
                .select({
                    message: ThemeMessage.message,
                })
                .from(Theme)
                .innerJoin(
                    ThemeMessage,
                    // Postgres arrays are 1-indexed: Theme.messagesOrder[1] gets the 1st ID
                    eq(ThemeMessage.id, sql`${Theme.messagesOrder}[1]`)
                )
                .where(eq(Theme.id, parsedThemeId));

            if (result.length === 0) throw new apiError(404, "Not Found", "No such theme id is found in the db")

            await client.set(`theme:${assignedThemeId}:message:1`, result[0]?.message)
        }

        return res.status(200).json(new apiResponse(200, result, "Start message fetched successfully!"))
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const scanQR = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params
        const { themeId, level } = req.body    // frontend will send this after scanning the QR

        if (!themeId || !level) throw new apiError(400, "Required values not found", "Either themeId or level is missing in request's body")

        if (!groupId || typeof groupId !== 'string') throw new apiError(400, "Invalid group ID", "Group ID must be a valid string")

        const isExited = (await client.sIsMember('groups:aborted', groupId)) || (await client.sIsMember('groups:disqualified', groupId))
        if (isExited) throw new apiError(403, "Forbidden", "You cannot access this route as you had either aborted or had been disqualified from the game")

        const assignedThemeId = await client.get(`theme:${groupId}`)

        if (!assignedThemeId) throw new apiError(500, "Redis Fetching Error", "Could not fetch the assigned theme for this group")

        const parsedThemeId = Number(assignedThemeId)

        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        if (parsedThemeId !== Number(themeId)) throw new apiError(400, "Wrong QR scanned", "The QR you are scanning is of a different theme and not of your assigned theme")

        const parsedGroupId = Number(groupId)

        if (isNaN(parsedGroupId)) {
            throw new apiError(400, "Invalid group ID", "Group ID must be a valid number")
        }

        const levelReached = await db.select({ maxLevelReached: Group.maxLevelReached })
            .from(Group)
            .where(eq(Group.id, parsedGroupId))

        if (levelReached.length === 0) throw new apiError(404, "Not Found", "No such entry of this group id exists in db")


        const parsedLevel = Number(level)
        if (isNaN(parsedLevel)) {
            throw new apiError(400, "Invalid level", "Level must be a valid number between 1 and 6")
        }

        const maxLevelReached = Number(levelReached[0]?.maxLevelReached)

        if (maxLevelReached !== parsedLevel - 1) {
            throw new apiError(403, "Cannot Access", `Cannot access this QR as you had completed till level ${maxLevelReached} and you are accessing QR of level ${parsedLevel}. Complete the levels in order.`)
        }

        let result: any = JSON.parse(await client.get(`theme:${assignedThemeId}:question:${parsedLevel}`) || '{}')
        let finalResult: any = {}
        if (!result || Object.keys(result).length === 0) {

            result = await db
                .select({
                    question: Question.question,
                    answer: Question.answer,
                    domain: Question.domain,
                    hints: Question.hints
                })
                .from(Theme)
                .innerJoin(
                    Question,
                    eq(Question.id, sql`${Theme.questionOrder}[${parsedLevel}]`)
                )
                .where(eq(Theme.id, parsedThemeId));

            if (result.length === 0) throw new apiError(404, "Not Found", "No such theme id is found in the db")

            await client.set(`theme:${assignedThemeId}:question:${parsedLevel}`, result[0])        // this 'result[0]' value has four fields in json {question, answer, domain, hints}

            finalResult = [{
                question: result[0]?.question,
                answer: result[0]?.answer,          // it will be an array
                domain: result[0]?.domain
            }]
        }
        else {
            finalResult = [{
                question: result?.question,
                answer: result?.answer,          // it will be an array
                domain: result?.domain
            }]
        }

        return res.status(200).json(new apiResponse(200, finalResult, `Question for level ${parsedLevel} fetched successfully`))

    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const useHints = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params
        const { level } = req.body          // will provide the level value for which the hint is being requested

        if (!level) throw new apiError(400, "Missing level value", "The value of the level for which the hint is being requested is missing from the request body")

        const parsedGroupId = Number(groupId)

        if (isNaN(parsedGroupId)) {
            throw new apiError(400, "Invalid group ID", "Group ID must be a valid number")
        }

        const assignedThemeId = await client.get(`theme:${groupId}`)

        if (!assignedThemeId) throw new apiError(500, "Redis Fetching Error", "Could not fetch the assigned theme for this group")

        const parsedThemeId = Number(assignedThemeId)

        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        Dont forget to add logs in this part that which groupId has used which hint(hint[0], hint[1], etc.) at which stage, along with thier updated points after using the hints

        const maxLevelReached = await client.get(`maxLevel:${groupId}`)
        if (!maxLevelReached) throw new apiError(500, "Missing maxLevelReached value", "The value of max level reached is missing from the redis")

        const parsedLevel = Number(level)
        if (isNaN(parsedLevel)) {
            throw new apiError(400, "Invalid level", "Level must be a valid number between 1 and 6")
        }

        if (Number(maxLevelReached) !== parsedLevel - 1) {
            throw new apiError(403, "Cannot Access", `Cannot access the hint of this level as you are currently on level ${maxLevelReached}`)
        }

        const maxHintsUsed = await client.get(`hints:${groupId}:${parsedLevel}`);

        let result = ""
        if (!maxHintsUsed) {
            const cache = JSON.parse(await client.get(`theme:${assignedThemeId}:question:${parsedLevel}`) || '{}')
            if (!cache || Object.keys(cache).length === 0) throw new apiError(500, "Hints Cache Not Found", "The cache in which hints are stored cannot be fetched from redis")

            const hints = cache?.hints
            result = hints[0]           // at least one hint will be there for each question

            await client.set(`hints:${groupId}:${parsedLevel}`, 1)      // 1 indicate that 1 hint has been used for this question
        } else {
            const cache = JSON.parse(await client.get(`theme:${assignedThemeId}:question:${parsedLevel}`) || '{}')
            if (!cache || Object.keys(cache).length === 0) throw new apiError(500, "Hints Cache Not Found", "The cache in which hints are stored cannot be fetched from redis")

            const hints = cache?.hints
            if (hints.length === Number(maxHintsUsed)) throw new apiError(400, "All Hints Used", "All hints for this question has been used")

            result = hints[Number(maxHintsUsed)]

            await client.set(`hints:${groupId}:${parsedLevel}`, (Number(maxHintsUsed) + 1))
        }

        const pointsToDeduct = POINTS.levels[parsedLevel - 1]?.hint

        const updated = await db
            .update(Group)
            .set({
                points: sql`
          CASE 
            WHEN ${Group.points} <= 0 THEN 
              raise_exception('Cant use more hints, you points are already 0')
            WHEN ${Group.points} - ${pointsToDeduct} < 0 THEN 
              raise_exception('You do not have sufficient points to use this hint')
            ELSE 
              ${Group.points} - ${pointsToDeduct}
          END
        `,
            })
            .where(eq(Group.id, parsedGroupId))
            .returning({ points: Group.points });

        if (updated.length === 0) throw new apiError(404, "Not Found", `Group with ID ${groupId} not found.`)

        const finalResult = {
            hintNumber: (maxHintsUsed) ? (Number(maxHintsUsed) + 1) : (1),
            hint: result,
            updatedPoint: updated[0]?.points
        }

        return res.status(200)
            .json(new apiResponse(200, finalResult, "Hint fetched successfully!"))
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        if (error.message?.includes('Cant use more hints, you points are already 0')) {
            return res.status(400)
                .json(new apiError(400, "Cannot access more hints", "Cant use more hints, you points are already 0"))
        }
        else if (error.message?.includes('You do not have sufficient points to use this hint')) {
            return res.status(400)
                .json(new apiError(400, "Cannot access this hint", "You do not have sufficient points to use this hint"))
        }


        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const updatePoints = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params

        const maxLevelReached = await client.get(`maxLevel:${groupId}`)
        if (!maxLevelReached) throw new apiError(500, "Missing maxLevelReached value", "The value of max level reached is missing from the redis")

        const pointsToAdd = POINTS.levels[Number(maxLevelReached)]?.pass
        const newLevel = levelSchema.safeParse(String(Number(maxLevelReached) + 1))         // as 'maxLevelReached' came from redis, so it will be a string only, even if you had passed a number value for it

        if (!newLevel.success) throw new apiError(500, "Invalid Level Value", "The new value of maxLevelReached we are trying to update, does not match the required enum to be updated in the db")

        if (!pointsToAdd) throw new apiError(500, "Something went wrong", "Something went wrong while fetching the pass points for this stage")

        const parsedGroupId = Number(groupId)

        if (isNaN(parsedGroupId)) {
            throw new apiError(400, "Invalid group ID", "Group ID must be a valid number")
        }

        let result: any = []
        let message: any = ""
        if (newLevel.data === '6') {
            const startTime = Number(await client.get('game:startTime'))
            const currentTime = new Date().getTime();
            const timeTaken = currentTime - startTime;

            result = await db
                .update(Group)
                .set({
                    points: sql`${Group.points} + ${pointsToAdd}`,
                    maxLevelReached: newLevel.data,
                    status: 'cleared',
                    timeTaken: (timeTaken / 60000).toFixed(2)          // 1 minute = 60,000 miliseconds
                })
                .where(eq(Group.id, parsedGroupId))
                .returning({ id: Group.id, status: Group.status, points: Group.points, timeTaken: Group.timeTaken, maxLevelReached: Group.maxLevelReached })

            if (result.length == 0) throw new apiError(404, "Not Found", "So such group with this groupId is found!")

            message = "Congratulations, You had successfully cleared all the levels. Now naviagte back to the Game Arena and wait for the results"
        }
        else {
            const { result_new, message_new } = await db.transaction(async (tx) => {
                // 1. Update Group Points & Max Level
                const updatedGroups = await tx
                    .update(Group)
                    .set({
                        points: sql`${Group.points} + ${pointsToAdd}`,
                        maxLevelReached: newLevel.data,
                    })
                    .where(eq(Group.id, parsedGroupId))
                    .returning({
                        id: Group.id,
                        points: Group.points,
                        maxLevelReached: Group.maxLevelReached,
                    });

                if (updatedGroups.length === 0) {
                    throw new apiError(404, "Not Found", "No such group with this groupId was found!");
                }

                // 2. Redis Operations (Theme Retrieval)
                const assignedThemeId = await client.get(`theme:${groupId}`);

                if (!assignedThemeId) {
                    throw new apiError(
                        500,
                        "Redis Fetching Error",
                        "Could not fetch the assigned theme for this group"
                    );
                }

                let finalMessage = await client.get(
                    `theme:${assignedThemeId}:message:${newLevel.data + 1}`
                );

                // 3. Fallback to DB query inside transaction if cache misses
                if (!finalMessage) {
                    const parsedThemeId = Number(assignedThemeId);

                    if (isNaN(parsedThemeId)) {
                        throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number");
                    }

                    const themeResults = await tx
                        .select({
                            message: ThemeMessage.message,
                        })
                        .from(Theme)
                        .innerJoin(
                            ThemeMessage,
                            eq(
                                ThemeMessage.id,
                                sql`${Theme.messagesOrder}[${newLevel.data + 1}]`
                            )
                        )
                        .where(eq(Theme.id, parsedThemeId));

                    if (themeResults.length === 0) {
                        throw new apiError(404, "Not Found", "No such theme id was found in the db");
                    }

                    finalMessage = themeResults[0]?.message  ||  "";
                    if(finalMessage === "")     throw new apiError(500, "Something Went Wrong", "Although 'themeResults' had been fetched from the db, there is some error in getting the 'message' from it")

                    // Cache the retrieved message back into Redis
                    await client.set(
                        `theme:${assignedThemeId}:message:${newLevel.data + 1}`,
                        finalMessage
                    );
                }

                // Return values out of the transaction
                return {
                    result_new: updatedGroups,
                    message_new: finalMessage,
                };
            });

            result = result_new;
            message = message_new;
        }

        const finalResult = [{ result, message }]
        await client.del(`hints:${groupId}:${maxLevelReached + 1}`)
        await client.set(`hints:${groupId}:${maxLevelReached + 1}`)     // dekho isme ky key-value hoga

        return res.status(200).json(new apiResponse(200, finalResult, "Points updated successfully. Take the next message provided and move ahead"))
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}


redis.set(`maxLevel:${groupId}`, <maxLevelReached>)         // use this and add it in start qr controller and point updating controller too