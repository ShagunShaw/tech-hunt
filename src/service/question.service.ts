import { apiError } from "../utils/ApiError";
import { domainSchema } from "../validations/tokenUser.type";


interface UpdatePayload {
    question?: string;
    domain?: string;
    answer?: string[];
}

export const updateQuestion = async (question: string, domain: string, answer: any, questionId: any) => {
    try {
        if (!question && !domain && !answer) throw new apiError(422, "Invalid Format", "At least one the question, answer or domain field is required!")

        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        let updatePayload: UpdatePayload = {};

        if (question !== undefined) updatePayload.question = question
        if (domain !== undefined) {
            const validate = domainSchema.safeParse(domain)
            if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

            updatePayload.question = question
        }
        if (answer !== undefined) {
            if (!Array.isArray(answer) || answer.length === 0) throw new apiError(422, "Invalid Format", "'answer' field should be a non-empty array, even if it has only one changed value")
            updatePayload.answer = answer
        }

        const result = await db.update(Question)
            .set(updatePayload)
            .where(eq(Question.id, parsedQuestionId))
            .returning({ question: Question.question, answer: Question.answer, domain: Question.domain })

        if (result.length === 0) throw new apiError(404, "Not Found", "No such question of this id is found")

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