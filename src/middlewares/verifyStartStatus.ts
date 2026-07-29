import type { NextFunction, Request, Response } from "express"
import client from "../redis.config"
import { apiError } from "../utils/ApiError"

export const isRunning = async (req: any, res: Response, next: NextFunction) => {
    try {
        const startTime = Number(await client.get('game:startTime'))
        // const startTime = time ? new Date(time) : null      // as redis always returns a string, so need to explicitly convert it to 'timestamp'
        const running = await client.get('game:isRunning')
        const duration = Number(await client.get('game:duration'))

        // if(!startTime)      return res.status(500).json(new apiError(500, "Redis Error", "Start Time not found in Redis"))
        if (!running) return res.status(400).json(new apiError(400, "Game not Started", "You cannot access this route as the game has not started now"))

        if (running === 'true') {
            const currentTime = new Date().getTime();

            if ((currentTime - startTime) / 1000 >= duration) return res.status(403).json(new apiError(403, "Game Ended", "You now cannot access any game route as the game has been ended now"))
        } else {
            return res.status(403).json(new apiError(403, "Game Ended", "You cannot access this game route now as the game has been ended"))
        }

        return next();
    } catch (error) {
        return res.status(500).json(new apiError(500, "Unknown Error", "Something went wrong"))
    }
}