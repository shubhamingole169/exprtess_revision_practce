import  express  from 'express';
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


//seting limit to access usage
app.use(express.json({limit:"16kb"}))

//somethime url get in encoded form for undestanding those
app.use(express.urlencoded({extended: true, limit:"16kb"}))

//for store some static file in serer temp basically
app.use(express.static("public"))

//for setting secure cookies acessing
app.use(cookieParser())


// routes import
import userRouter from "./routes/user.route.js"

// routes declaration
app.use("/api/v1/users", userRouter)


// http://localhost:8000/api/v1/users/register

export { app }