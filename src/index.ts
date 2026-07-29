Dont forget to add logger in the end

import express from 'express'
import 'dotenv/config'
import { apiResponse } from './utils/ApiResponse'
import client from './redis.config'
import cookieParser from 'cookie-parser'
// no need to connect our db here, its already connected, so now just use it in any file you want
import UserRouter from "./routes/user.router"
import SuperAdminRouter from "./routes/super-admin.routes"
import GroupRouter from "./routes/group.routes"
import ThemeRouter from "./routes/theme.routes"

await client.connect();

const PORT= process.env.PORT || 3000
const app= express()

add the field of 'updatedAt' also in each table, and see how it can be managed so that every time an update is done, 'updatedAt' field gets updated automatically (without needing to update it manually)

dont forget to add the super-admin record directly in our db, with status= 'approved'
Also dont forget to add the row of 'GameConfig' table directly in our db

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api/v1", UserRouter)
app.use("/api/v1/super-admin", SuperAdminRouter)
app.use("/api/v1/group", GroupRouter)
app.use("/api/v1/theme", ThemeRouter)


app.get("/health", (req, res) => {
    return res.status(200)
              .json(new apiResponse(200, {health: "ok"}, "Server is healthy!"))
})


app.listen(PORT, () => {
    console.log(`Server is established at port -> ${PORT}`);
});