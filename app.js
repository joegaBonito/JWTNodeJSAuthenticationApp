/* =======================
    LOAD THE DEPENDENCIES
==========================*/
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mongoose = require('mongoose')

/* =======================
    LOAD THE CONFIG
==========================*/
const config = require('./config')
const port = process.env.PORT || 3001 

/* =======================
    EXPRESS CONFIGURATION
==========================*/
const app = express()
var cors = require('cors')

app.use(cors()) // Use this after the variable declaration

// parse JSON and url-encoded query
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// print the request log on console
app.use(morgan('dev'))

// set the secret key variable for jwt
app.set('jwt-access_token_secret', config.ACCESS_TOKEN_SECRET);
app.set('jwt-refresh_token_secret', config.REFRESH_TOKEN_SECRET);

console.log('jwt-access_token_secret ' + config.ACCESS_TOKEN_SECRET);
console.log('jwt-refresh_token_secret ' + config.REFRESH_TOKEN_SECRET);

// configure api router
app.use('/api', require('./routes/api'))

// open the server
app.listen(port, () => {
    console.log(`Express is running on port ${port}`)
})



/* =======================
    CONNECT TO MONGODB SERVER
==========================*/
mongoose.connect(config.mongodbUri)
const db = mongoose.connection
db.on('error', console.error)
db.once('open', ()=>{
    console.log('connected to mongodb server')
})