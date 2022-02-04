//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const FacebookStrategy = require("passport-facebook").Strategy;
// const InstagramStrategy = require("passport-instagram").Strategy;

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret:"Our little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin:admin@cluster0.p73h5.mongodb.net/userDB");

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  // facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{ secret: process.env.secret ,encryptedFields:["password"]});

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// passport.use(new FacebookStrategy({
//     clientID: process.env.APP_ID,
//     clientSecret: process.env.APP_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// passport.use(new InstagramStrategy({
//     clientID: process.env.INSTA_ID,
//     clientSecret: process.env.INSTA_SECRET,
//     callbackURL: "http://localhost:3000/auth/instagram/secrets"
//   },
//   function(accessToken, refreshToken, profile, done) {
//     User.findOrCreate({ instagramId: profile.id }, function (err, user) {
//       return done(err, user);
//     });
//   }
// ));

// app.get("/",(req,res)=>{
//   res.sendFile("C:\Users\AYUSH\Desktop\Web-Development\Secrets\index.html");
// });

app.get("/home",(req,res)=>{
  res.render("home");
});

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

// views\register.ejs

app.get("/auth/google/secrets",
passport.authenticate('google', { failureRedirect:  '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect("/secrets");
});

// app.get("/auth/facebook",
//   passport.authenticate('facebook', { scope: ["profile"] }));
//
// app.get("/auth/facebook/secrets",
//   passport.authenticate('facebook', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/secrets');
//   });

// app.get('/auth/instagram',
//   passport.authenticate('instagram'));
//
// app.get('/auth/instagram/callback',
//   passport.authenticate('instagram', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/');
//   });

  app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });
  });
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.post("/register",(req,res)=>{

      User.register({username:req.body.username},req.body.password,(err,user)=>{
        if(err){
          console.log(err);
          res.redirect("/register");
        }else{
          passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
          })
        }
      });

  //   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //     const newUser = new User({
  //       email: req.body.username,
  //       password: hash
  //     });
  //     newUser.save(function(err){
  //       if(err)
  //       console.log(err);
  //       else
  //       res.render("secrets");
  //     });
  // });

});

app.post("/login",(req,res)=>{
  const user = new User({
    username:req.body.username,
    password:req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local",{ failureRedirect: '/login', failureMessage: true })(req,res,function(){
        res.redirect("/secrets");
      })
    }
  });


  // below is used for bcrypt
  // const username = req.body.username;
  // const password = req.body.password;
  //
  // User.findOne({email:username},function(err,founduser){
  //   if(err)
  //   console.log(err);
  //   else{
  //     if(founduser)
  //     {
  //       bcrypt.compare(password, founduser.password, function(err, result) {
  //         if(result === true)
  //         res.render("secrets");
  //       });
  //
  //     }
  //
  //   }
  // });

});

app.listen(process.env.PORT || 3000,function(){
  console.log("server started running on port 3000");
});
