import { db } from "../drizzle/db";
import { Group, Question, Theme, ThemeMessage } from "../drizzle/schema";
import client from "../redis.config";
import { apiError } from "../utils/ApiError";
import type { Request, Response } from 'express'
import { eq, sql } from "drizzle-orm";
import { apiResponse } from "../utils/ApiResponse";
import { isAborted } from "zod/v3";

export const scanStartQR = async (req: any, res: Response) => {
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

export const scanQR = async (req: any, res: Response) => {
    try {
        const { groupId } = req.params
        const { themeId, level } = req.body    // frontend will send this after scanning the QR

        if (!themeId || !level) throw new apiError(400, "Required values not found", "Either themeId or level is missing in request's body")

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

export const useHints = async (req: any, res: Response) => {
    try {

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