import type { NextFunction, Request, Response } from "express"
import { apiError } from "../utils/ApiError"

// Handling Role-Based Access Control
export const authorize = (...roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        try {
            const role = req.user.role

            const isAllowed = roles.find(val => role === val)
            if (!isAllowed) {
                return res.status(403).json(new apiError(403, "Forbidden Access", "You are not allowed to access this route"))
            }

            return next()
        } catch (error) {
            return res.status(500).json(new apiError(500, "Unknown Error", "Something went wrong"))
        }
    }
}

// We needed higher order function in case of this middleware only and not other middlewares because 'authorize' middleware takes some parameters like 'partcipant', 'admin', 'super-admin' whereas other middlewares do not. So, rule of thumb, always include a higher order function for the middlwares that takes some params in its function, else keep it like a normal function and no need to over-engineer it by making it a higher-order function