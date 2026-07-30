import type { Request, Response } from 'express'
import { apiError } from '../utils/ApiError';

import { db } from "../drizzle/db"
import { Theme } from '../drizzle/schema';
import { apiResponse } from '../utils/ApiResponse';
import { count, eq } from 'drizzle-orm';

export const createTheme = async (req: Request, res: Response) => {
    try {
        const { theme } = req.body

        const [totalThemeCount] = await db.select({ value: count() }).from(Theme);

        if(!totalThemeCount)    throw new apiError(500, "Unable to fetch themes count", "Can't fetch total themes count in the db at this moment")

        if (totalThemeCount.value >= 6) {       // To ensure that at most 6 themes are there in the themes table, according to our plan
            throw new apiError(400, "Cannot insert", "Themes table is capped at max of 6 themes");
        }

        if (theme.trim().length > 50) throw new apiError(422, "Length Exceeded", "Theme length cannot be more than 50")

        const result = await db.insert(Theme)
            .values({ name: theme })
            .returning({ id: Theme.id });

        if (result.length === 0) throw new apiError(500, "Could not insert", "Something went wrong while inserting the theme in the db")

        return res.status(201)
            .json(new apiResponse(201, { id: result[0]?.id }, "Theme registered successfully"))
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json(
                new apiError(409, "Conflict Error", "Cannot have duplicate themes in the db")
            );
        }

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

export const updateTheme = async (req: Request, res: Response) => {
    try {
        const { themeId } = req.params
        const { newThemeName } = req.body

        const parsedThemeId = Number(themeId)

        if (!Number.isInteger(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        const result = await db.update(Theme)
            .set({ name: newThemeName })
            .where(eq(Theme.id, parsedThemeId))
            .returning({ id: Theme.id });

        if (result.length === 0) throw new apiError(500, "Could not update", "Something went wrong while updating the theme in the db")

        return res.status(200)
            .json(new apiResponse(200, { id: result[0]?.id }, "Theme updated successfully!"))

    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json(
                new apiError(409, "Conflict Error", "Cannot have duplicate themes in the db")
            );
        }

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

export const deleteTheme = async (req: Request, res: Response) => {
    try {
        const { themeId } = req.params

        const parsedThemeId = Number(themeId)

        if (!Number.isInteger(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        const result = await db.delete(Theme)
            .where(eq(Theme.id, parsedThemeId))
            .returning({ id: Theme.id });

        return res.status(200)
            .json(new apiResponse(200, { id: result[0]?.id }, "Theme deleted Successfully!"))
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

export const addThemeMessage = (req: any, res: Response) => {
    
}

export const updateThemeMessage = (req: any, res: Response) => {

}

export const deleteThemeMessage = (req: any, res: Response) => {

}

export const reorderThemeMessage = (req: any, res: Response) => {

}