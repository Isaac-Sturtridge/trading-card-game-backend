
const passport = require("passport"); 
const LocalStrategy = require("passport-local").Strategy; 
const Users = require("./models/user.models"); 
const bcrypt = require("bcrypt"); 
  
passport.use( 
    new LocalStrategy(async (username, password, done) => { 
        try { 
            // Find the user by username in the database 
            const user = await Users.findOne({ username }); 
            console.log(user)
            // If the user does not exist, return an error 
            if (!user) { 
                return done(null, false, { error: "Incorrect username" }); 
            } 
  
            // Compare the provided password with the  
            // hashed password in the database 
            const passwordsMatch = await bcrypt.compare( 
                password, 
                user.password 
            ); 
  
            // If the passwords match, return the user object 
            if (passwordsMatch) { 
                return done(null, user); 
            } else { 
                // If the passwords don't match, return an error 
                return done(null, false, { error: "Incorrect password" }); 
            } 
        } catch (err) { 
            return done(err); 
        } 
    }) 
); 