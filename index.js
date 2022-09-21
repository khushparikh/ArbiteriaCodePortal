const express = require('express');
const app = express('');
const path = require('path');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const mongoose = require('mongoose');
const Student = require('./models/student');
const Admin = require('./models/admin');


var output;

const requireLogin = (req, res, next) => {
    if(!req.session.user_id){
        res.redirect('/')
    }
    else{
        next();
    }
}

const requireAdminLogin = (req, res, next) => {
    const checkAdmin = Admin.findById(req.session.user_id);
    const checkStudent = Student.findById(req.session.user_id);
    if(checkAdmin) {
        next();
    } else if(checkStudent) {
        res.redirect('/sProfilePage')
    } else {
        res.redirect('/')
    }
}


mongoose.connect('mongodb://localhost:27017/codegrader', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Mongo Database Connected");
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(session({secret: 'notagoodsecret'}));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', async(req, res) => {
    res.render('home.ejs')
})
app.get('/grader', requireLogin, async(req, res) => {
    res.render('grader.ejs')
})
    

app.post('/grader', async(req, res) => {
    const {fName, prompt, userSteps} = req.body;
    console.log(req.body)
    const inputPrompt = prompt + "\n\"\"\"\"\n Here's What the Code is Doing: \n 1. ";
    console.log(inputPrompt)

    // Open AI API Used
    const { Configuration, OpenAIApi } = require("openai");
    
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const openai = new OpenAIApi(configuration);

    // Defines Parameters for API-aided Completion
    const response = await openai.createCompletion({
        model: "code-davinci-002",
        prompt: inputPrompt,
        temperature: 0,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: ["\"\"\""],   
    });

    output = response.data.choices[0].text;

    /* Add New Function & User Steps to DB
    const editStudent = await Student.findByIdAndUpdate(req.session.user_id, prompt, {runValidators: true, new: true});
    editStudent.functions.code = prompt;
    editStudent.functions.cExplanation = output;
    editStudent.functions.uExplanation = userSteps;
    await editStudent.save()
    */
    
    const newFunction = {
        fName,
        code: prompt,
        cExplanation: output,
        uExplanation: userSteps
    }
    var editStudent = await Student.findByIdAndUpdate(req.session.user_id, newFunction);
    editStudent.functions.push(newFunction);
    await editStudent.save();
    
    /*
    var allFunctions = [];
    allFunctions.push(editStudent.functions)
    console.log("This is previous functions:")
    console.log(allFunctions)
    allFunctions.push(newFunction)
    editStudent.functions = allFunctions;
    const update = await editStudent.save()
    */
    res.redirect('/steps')
})

app.get('/steps', requireLogin, async(req, res) => {
    const student = await Student.findById(req.session.user_id);
    console.log(student.functions)
    res.render('steps.ejs', {student})
})

app.get('/studentLogin', async(req,res) => {
    if(req.session.user_id) {
        res.redirect('sProfilePage.ejs')
    } else {
        res.render('studentLogin.ejs')
    }
})

app.post('/studentLogin', async(req, res) => {
    const {username, password} = req.body;
    console.log(username)
    const user = await Student.findOne({username});
    console.log(user)
    if(!user){
        res.redirect('/studentLogin')
    }
    else{
        console.log(user.password);
        const validPassword = await bcrypt.compare(password, user.password);
        console.log(validPassword)
        if(validPassword){
            req.session.user_id = user._id;
            res.redirect('/sProfilePage');
        }
        else{
            res.redirect('/studentLogin');
        }
    }
})

app.get('/studentRegister', async(req,res) => {
    if(req.session.user_id) {
        res.redirect('sProfilePage.ejs')
    } else {
        res.render('studentRegister.ejs')
    }
})

app.post('/studentRegister', async(req, res) => {
    const {name, username, password, discord_id} = req.body;
    const hash = await bcrypt.hash(password, 12);


    //Creation of New Student In Database
    const newStudent = new Student({
        name,
        username,
        password: hash,
        discord_id
    })

    await newStudent.save();
    console.log(newStudent);
    req.session.user_id = newStudent.id;
    res.redirect('/sProfilePage')
})

app.get('/sProfilePage', requireLogin, async(req, res) => {
    const student = await Student.findById(req.session.user_id);
    if(!student) {
        res.render('/')
    } else {
        res.render('sProfilePage.ejs', {student})
    }
})

app.get('/pastCode', requireLogin, async(req, res) => {
    const student = await Student.findById(req.session.user_id);
    res.render('pastCode.ejs', {student})
})

app.get('/function/:id', requireLogin, async(req, res) => {
    const {id} = req.params;
    const student = await Student.findById(req.session.user_id);
    var method;
    for(let i = 0; i < student.functions.length; i++) {
        if(student.functions[i].id == id) {
            method = student.functions[i];
            break;
        }
    }
    res.render('function.ejs', {method})
})

app.get('/adminRegister', async(req, res) => {
    if(req.session.user_id) {
        res.redirect('/')
    } else {
        res.render('adminRegister.ejs')
    }
})

app.post('/adminRegister', async(req, res) => {
    const {name, username, password, discord_id} = req.body;
    const hash = await bcrypt.hash(password, 12);


    //Creation of New Student In Database
    const newAdmin = new Admin({
        name,
        username,
        password: hash,
        discord_id
    })

    await newAdmin.save();
    req.session.user_id = newAdmin.id;
    res.redirect('/aProfilePage')
})

app.get('/adminLogin', async(req, res) => {
    if(req.session.user_id) {
        res.redirect('/')
    } else {
        res.render('adminLogin.ejs')
    }
})

app.post('/adminLogin', async(req, res) => {
    const {username, password} = req.body;
    console.log(username)
    const user = await Admin.findOne({username});
    console.log(user)
    if(!user){
        res.redirect('/adminLogin')
    }
    else{
        console.log(user.password);
        const validPassword = await bcrypt.compare(password, user.password);
        console.log(validPassword)
        if(validPassword){
            req.session.user_id = user._id;
            res.redirect('/aProfilePage');
        }
        else{
            res.redirect('/adminLogin');
        }
    }
})

app.get('/aProfilePage', async(req, res) => {
    const admin = await Admin.findById(req.session.user_id);
    if(!admin) {
        res.redirect('/')
    } else {
        res.render('aProfilePage.ejs', {admin})
    }
})

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
})

app.get('/students', requireAdminLogin, async(req, res) => {
    const students = await Student.find({})
    res.render('students.ejs', {students})
})

app.get('/student/:id', async(req, res) => {
    const {id} = req.params;
    const student = await Student.findById(id);
    res.render('student.ejs', {student})
})

app.listen(3000, () =>{
    console.log("LISTENING ON PORT 3000")
})