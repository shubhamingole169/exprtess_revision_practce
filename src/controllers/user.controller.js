import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from './../models/use.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt  from 'jsonwebtoken';


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

    if(!username && !email){
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

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

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


const refreshAccessToken = asyncHandler(async (req, res) => {
    
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unathorized request !!!")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token !!!")
        }
    
        if(incomingRefreshToken !== user?.refreshAccessToken){
            throw new ApiError(401, "Refresh token is expired or used !!!")
        }
    
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
            {accessToken, refreshToken: newRefreshToken})
        )
    } catch (error) {
        throw new ApiError(401, error?.message || " Invalid refresh Token")
    }

})


const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)


if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid old Password")
}

user.password = newPassword
await user.save({validateBeforeSave: false})

return res
.status(200)
.json(new ApiResponse(200, {}, " Password changed successfully !!!"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "current user fetched successfully !!!")
    )
})

const updateAccountDetils = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(! fullName || !email){
        throw new ApiError(400, "All field are required !!!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password ")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detatils has been Updated successfully !!!"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar files is missing !!!");
    }

    //Todo : delete old pic from cloudinary old avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath)


    if(!avatar.url){
        throw new ApiError(400, "Error while Uploading avatar !!!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully !!!")
    )




})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image files is missing !!!");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if(!coverImage.url){
        throw new ApiError(400, "Error while Uploading cover Image !!!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image updated successfully !!!")
    )
})



const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing!");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCounts: { $size: "$subscribers" },
                channelSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCounts: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel.length) {
        throw new ApiError(404, "Channel not found!");
    }

    res.status(200).json(
        new ApiResponse(200, channel[0], "User Channel fetched Successfully")
    )



});




export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetils,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile

}