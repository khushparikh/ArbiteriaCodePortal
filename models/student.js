const mongoose = require('mongoose');

const functionSchema = new mongoose.Schema({
    fName: String,
    code: String,
    cExplanation: String,
    uExplanation: String
})

const studentSchema = new mongoose.Schema({
    name: String,
    username: {
        type: String,
        required: [true, 'Username Cannot Be Blank']
    },
    password: {
        type: String,
        required: [true, 'Password Cannot Be Blank']
    },
    discord_id: String,
    functions:  [functionSchema]
})


const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 