import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from './../models/use.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken }



    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and acees token !!!")
    }
}



const registerUser = asyncHandler ( async (req, res) => {
    //1. get user details fronot frontend
    //2. validatoion - not empty
    //3. check if user already exists
    //4. check for amages, check for avatat
    //5. upload them to cloudinary
    //6. creeate user object - create entry in db
    //7. remove pasword and refresh toke field from response
    //8. check for user creation
    //9. return res

    const {fullName, email, username, password} = req.body
    // console.log("email:", email)

    // do user give all field checking
    if(
        [fullName, email, username, password].some((field) => field?.trim() ==="" )
    ){
        throw new ApiError(400, "All field are required !!!")
    }

    // user already exist ? checking

    const existedUser = await User.findOne({
        $or: [ { username }, { email }]
    })

    if(existedUser){
        throw new ApiError(400, " user with email or username already exists")
    }

    //checking images are availbel or not

    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImagePath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar files is required !!!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log("avatar 51 getting error on cludinary upload",avatar)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "avatar files is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "something went wrong while registeting the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User register successfully !!!")
    )









})

const loginUser = asyncHandler(async (req, res) => {
    // 1.req body -> data
    // 2. username or email
    // 3. find the user
    // 4. check password
    // 5. access token and refresh token
    // 6. send cookies

    const { email, username, password } = req.body

    if(!username || !email){
        throw new ApiError(400, "username or email required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(!user){
        throw new ApiError(404, "User does not exist !!!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password - refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
    status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            'User logged in successfully !!!'
        )
    )

})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(
        200,{}, "User logged Out"
    ))
})


export {
    registerUser,
    loginUser,
    logOutUser
}