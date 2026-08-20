Dont forget to add logger in the end

import express from 'express'
import 'dotenv/config'
import { apiResponse } from './utils/ApiResponse'
import client from './redis.config'
import cookieParser from 'cookie-parser'
// no need to connect our db here, its already connected, so now just use it in any file you want
import UserRouter from "./routes/user.routes"
import SuperAdminRouter from "./routes/super-admin.routes"
import GroupRouter from "./routes/group.routes"
import ThemeRouter from "./routes/theme.routes"
import QuestionRouter from "./routes/question.routes"
import GameRouter from "./routes/game.routes"
import './workers/game.worker'          // Just importing it is enough — worker will starts listening automatically across all files

await client.connect();

const PORT= process.env.PORT || 3000
const app= express()

add the field of 'updatedAt' also in each table, and see how it can be managed so that every time an update is done, 'updatedAt' field gets updated automatically (without needing to update it manually)

dont forget to add the super-admin record directly in our db, with status= 'approved'
Also dont forget to add the row of 'GameConfig' table directly in our db

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))     // When extended is true, sending form inputs with an array in it will automatically arrive in req.body as a native JavaScript array, completely bypassing manual conversion to an array.

app.use("/api/v1", UserRouter)
app.use("/api/v1/super-admin", SuperAdminRouter)
app.use("/api/v1/group", GroupRouter)
app.use("/api/v1/theme", ThemeRouter)
app.use("/api/v1/question", QuestionRouter)
app.use("/api/v1/game", GameRouter)


app.get("/health", (req, res) => {
    return res.status(200)
              .json(new apiResponse(200, {health: "ok"}, "Server is healthy!"))
})


app.listen(PORT, () => {
    console.log(`Server is established at port -> ${PORT}`);
});