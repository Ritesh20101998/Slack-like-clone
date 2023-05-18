const express=require("express");
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const loginR=express.Router();
const cookieParser = require('cookie-parser')
const {User}=require("../models/user.model");
const { client } = require("../redis/redis");

loginR.get("/",(req,res)=>{
    res.send("Welcome")
})

loginR.post("/signup",async(req,res)=>{
    const {name, mobile,email,password,workspace} = req.body;
    try{
        const payload = req.body
        console.log(payload)
        const useravailable = await User.findOne({email:payload.email})
        if(useravailable){
            return res.status(200).send({msg:"User already present ,please login directly.."})
        }else{
            const hashedpass = await bcrypt.hashSync(password,5);
            payload.password = hashedpass

            const nuser = new User({name,mobile,email,password:hashedpass,workspace})
            await nuser.save()
            console.log(nuser)
            res.status(200).send({msg:"Signup Successfully done.."})
        }
    }catch(err){
        res.status(500).send({msg:err.message})
    }
})

loginR.post("/login",async(req,res)=>{
    try{
        const {email,password}= req.body;
    
        if(!email){
            return res.status(400).send({msg:"Wrong details provided.."})
        }

        const useravailable = await User.findOne({email})
        if(!useravailable) {
            return res.status(400).send({msg:"Please first register yourself.."})
        }
        // console.log(useravailable)
        const passwordCorrect = await bcrypt.compareSync(
            password,
            useravailable.password
        )
        if(!passwordCorrect){
            return res.status(400).send({msg:"Wrong password"})
        }

        const token = await jwt.sign(
            {email,userId:useravailable._id},
            process.env.jwt_secret_key ,
            {expiresIn:"1hr"}
        )

        const refresh_token = await jwt.sign(
            {userId:useravailable._id},
            process.env.refresh_secret_key ,
            {expiresIn:"3hr"}
        )

        console.log(token,refresh_token)
        res.status(200).send({msg:"Login Successfully..",token:token,refresh_token:refresh_token
    })
    }catch(err){
        res.status(500).send({msg:err.message})
    }
})

loginR.get("/logout",async(req,res)=>{
    try{
        const token = req.headers?.authorization?.split(" ")[1]
        const blacklistToken = blacklist.push(token)
        await blacklistToken.save()
        res.status(200).send({msg:"logout successfully.."})
    } catch(err){
        res.status(500).send({msg:err.message})
    }
})

loginR.get("/refreshtoken",async(req,res)=>{
    const refreshToken =  req.headers.authorization.split(" ")[1];

    if(!refreshToken){
        return res.status(400).send({msg:"Please login again.."})
    }

    jwt.verify(refreshToken,process.env.refresh_key,(err,decoded)=>{
        if(err){
            return res.send({msg:"Please login again.."})
        } else {
            const token = jwt.sign(
                {userId:decoded.userId,email:decoded.email},
                process.env.secret_key,
                {expiresIn:"1m"}
            )
            res.status(200).send({msg:"Login successfully done.."})
        }
    })
})

module.exports={loginR}