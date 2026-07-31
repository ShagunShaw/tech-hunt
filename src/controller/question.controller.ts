import type { Request, Response } from "express";
import { apiError } from "../utils/ApiError";
import { apiResponse } from "../utils/ApiResponse";

import { Question } from "../drizzle/schema";
import { db } from "../drizzle/db";
import { sql, eq } from "drizzle-orm";

export const addQuestion = async (req: Request, res: Response) => {
    try {
        const { question, answer, domain } = req.body

        if (!Array.isArray(answer)) throw new apiError(422, "Invalid Format", "'answer' field should be an array even if it has only 1 value")

        if (!question || !domain) throw new apiError(422, "Missing Values", "Either question or domain field is missing")

        Add type checking for domain ki wo DSA, Web, .... yh sb domain se hi ho

        const result = await db.insert(Question)
            .values({ question, answer, domain })
            .returning({ id: Question.id })

        if (result.length === 0) throw new apiError(500, "Could not insert", "Something went wrong while inserting the data")

        return res.status(201)
            .json(new apiResponse(201, "Insert Successful", "Question inserted successfully"))
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

bahaut confusing it, fix it tommorow
export const updateQuestion = (req: Request, res: Response) => {
    try {
        const { questionId } = req.params;
        if(!questionId || Array.isArray(questionId))     throw new apiError(422, "Field Error", "Either question id is not found in params or is given in an array format (not possible though)")

        const id = parseInt(questionId, 10);
        if (isNaN(id)) {
            throw new apiError(422, "Invalid Format", "questionId must be a valid number");
        }

        const { question, domain, answer, arrayIndex, arrayValue } = req.body;

        interface UpdatePayload {
            question?: string;
            domain?: string;
            answer?: string[];
        }

        let updatePayload: UpdatePayload = {};

        if (question !== undefined) {
            if (typeof question !== 'string' || question.trim() === '') {
                throw new apiError(422, "Invalid Format", "'question' must be a non-empty string");
            }
            updatePayload.question = question;
        }

        if (domain !== undefined) {
            check the value of domain using zod, wthether it has values of the decided domains or not and throw error if not
            updatePayload.domain = domain;
        }

        // CASE A: overwrite the entire array
        if (answer !== undefined) {
            if (!Array.isArray(answer) || answer.length === 0) {
                throw new apiError(422, "Invalid Format", "The 'answer' field must be a non-empty array");
            }
            if (!answer.every((a) => typeof a === 'string' && a.length <= 50)) {
                throw new apiError(422, "Invalid Format", "Each answer must be a string of at most 50 characters");
            }
            updatePayload.answer = answer;
        }
        // CASE B: update a single element inside the array
        else if (arrayIndex !== undefined && arrayValue !== undefined) {
            const index = Number(arrayIndex);
            if (!Number.isInteger(index) || index < 0) {
                throw new apiError(422, "Invalid Format", "arrayIndex must be a non-negative integer");
            }
            if (typeof arrayValue !== 'string' || arrayValue.length > 50) {
                throw new apiError(422, "Invalid Format", "arrayValue must be a string of at most 50 characters");
            }

            // Fetch the current row so we can safely mutate the array in JS,
            // rather than juggling 1-based indices/slicing directly in SQL.
            const existing = await db
                .select({ answer: Question.answer })
                .from(Question)
                .where(eq(Question.id, id));

            if (existing.length === 0) {
                return res.status(404).json({ error: "Question not found" });
            }

            const currentAnswer = [existing[0]?.answer];
            if (index >= currentAnswer.length) {
                throw new apiError(422, "Invalid Format", `arrayIndex ${index} is out of bounds (length ${currentAnswer.length})`);
            }

            currentAnswer[index] = arrayValue; // 0-based, no manual +1 needed
            updatePayload.answer = currentAnswer;
        }

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update" });
        }

        const updatedQuestion = await db
            .update(Question)
            .set(updatePayload)
            .where(eq(Question.id, id))
            .returning();

        if (updatedQuestion.length === 0) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.status(200).json({ message: "Updated successfully", data: updatedQuestion[0] });

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

export const deleteQuestion = (req: Request, res: Response) => {
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

export const getQuestion = (req: Request, res: Response) => {
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