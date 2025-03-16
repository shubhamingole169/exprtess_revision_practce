import { express } from 'express';
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: Process.env.CORS_ORIGIN,
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



export { app }