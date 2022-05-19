const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const route = require('./route/route');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb+srv://salman-110:Salman110@cluster0.qfvxy.mongodb.net/group35dataBase")
.then(() => console.log("MongoDB Is Connected"))
.catch(err => console.log(err));

app.use('/', route);

app.listen(process.env.PORT || 3000, function () {
    console.log('Express App Is Running On Port ' + (process.env.PORT || 3000))
});