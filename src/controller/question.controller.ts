import type { Request, Response } from "express";
import { apiError } from "../utils/ApiError";
import { apiResponse } from "../utils/ApiResponse";
import * as questionService from "../service/question.service"

import { Question } from "../drizzle/schema";
import { db } from "../drizzle/db";
import { eq } from "drizzle-orm";
import { domainSchema } from "../validations/tokenUser.type";

export const addQuestion = async (req: Request, res: Response) => {
    try {
        const { question, answer, domain } = req.body

        if (!question || !domain || !answer) throw new apiError(422, "Missing Values", "Either question or domain or answer field is missing")

        if (!Array.isArray(answer)) throw new apiError(422, "Invalid Format", "'answer' field should be an array even if it has only 1 value")

        const validate = domainSchema.safeParse(domain)
        if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

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

export const updateQuestion = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params
        const { question, domain, answer } = req.body       // Frontend can pass any of the values here, not necessarily has to pass all the values. Also, whenever there is a change in the 'answer' : only field value update or the entire array change, always the whole array is sent from the frontend, else it will be hard to detect, which one has actually changed.

        const result = await questionService.updateQuestion(question, domain, answer, questionId)

        return res.status(200)
            .json(new apiResponse(200, result, "Values updated successfully!"))

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

export const deleteQuestion = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params

        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        const result = await db.delete(Question)
                               .where(eq(Question.id, parsedQuestionId))
                               .returning({ id: Question.id })

        if(result.length === 0)     throw new apiError(404, "Not Found", "No such question of this id is found")

        return res.status(200)
                  .json(new apiResponse(200, result, "Question deleted successfully!"))
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