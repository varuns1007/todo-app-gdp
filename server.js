require("dotenv").config()
const express = require('express')
const app = express()
const path = require("path")
const logger = require("morgan")
const mongoose = require("mongoose")
const session = require("express-session")

const User = require("./models/user")
const Todo = require("./models/todo")

app.use(express.static(path.join(__dirname, "public")))
app.use(logger("dev"))
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

//SESSION
app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized:true,
}))

//EJS
app.set("view-engine", "ejs")

//DB Connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
}).then(() => console.log("DB connected"))
  .catch(error => console.log(error))

//Signup GET
app.get("/", (req, res) => {
    res.render("signup.ejs")
})

//Signup POST
app.post("/signup", async (req, res) => {
    try {
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        })
        await user.save();
        console.log("User created")
        res.redirect("/login")
    } catch {
        res.redirect("/")
    }
})

//Login GET
app.get("/login", (req, res) => {
    res.render("login.ejs")
})

//Login POST
app.post("/signin", async (req, res) => {
    await User.find({ email: req.body.email }).then(data => {
        if(req.body.password == data[0].password){
            req.session.user = data[0]
            res.redirect("/dashboard")
        }
    }).catch(e => {
        console.log(e)
        res.send("Error")
    })
})

//Dashboard
app.get("/dashboard", checkAuthentication, async (req, res) => {
    await Todo.find({ userId: req.session.user._id }).then(todo => {
        console.log(todo)
        res.render("dashboard.ejs", {
            todos: todo,
            name: req.session.user.name
        })
    })
})

//ADD Todo
app.post("/addtodo", async (req, res) => {
    try {
        console.log(req.session.user)
        const todo = new Todo({
            userId: req.session.user._id,
            content: req.body.content
        })
        await todo.save()
        console.log("Todo Added")
        res.redirect("/dashboard")
    } catch (error){
        console.log(error)
        res.send("Error")
    }
})

//Edit todo GET
app.get("/edittodo/:id", async (req, res) => {
    await Todo.findById(req.params.id).then(todo => {
        if(req.session.user._id == todo.userId){
            res.render("editTodo.ejs", {
                todo: todo
            })
        } else {
            res.redirect("/dashboard")
        }
    }).catch(e => {
        console.log(e)
        res.send("Error")
    } )
})

//Edit todo POST
app.post("/updatetodo/:id", async (req, res) => {
    await Todo.findOneAndUpdate({_id: req.params.id}, {
        $set: {
            content: req.body.content
        }
    }).then(result => {
        if(result) {
            console.log("Todo Updated")
            res.redirect("/dashboard")
        } else {
            res.send("Error")
        }
    }).catch(e => {
        res.send("Error in Catch")
    })
})

//DELETE todo
app.post("/deletetodo/:id", async (req, res) => {
    await Todo.findOneAndDelete({_id: req.params.id }).then(result => {
        if(result){
            console.log("Todo Deleted")
            res.redirect("/dashboard")
        } else {
            res.send("Error")
        }
    }).catch(e => {
        console.log(e)
        res.send("Error in Catch")
    })
})

//Logout
app.post("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

//MIDDLEWARE
function checkAuthentication(req, res, next) {
    if(req.session.user) {
        return next();
    } else {
        res.redirect("/")
    }
}

app.use(function (req, res){
    res.send("Page NOT Found")
})

let port = process.env.PORT || 3000; 

app.listen(port, () => {
  console.log("Listening on port 3000");
});