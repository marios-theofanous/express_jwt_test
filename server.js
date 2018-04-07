const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mongoose = require('mongoose')
const elasticsearch = require('elasticsearch')
const client = new elasticsearch.Client({
  hosts: ['https://o8m927zrwt:9zn8q7fruk@jwt-test-es-9025478226.eu-central-1.bonsaisearch.net']
})

client.indices.create({
  index: 'users'
}, function (err, resp, status) {
  if (err) {
  } else {
    console.log('create', resp)
  }
})

const jwt = require('jsonwebtoken') // used to create, sign, and verify tokens
const config = require('./config') // get our config file
const User = require('./app/models/user') // get our mongoose model

const port = process.env.PORT || 8080
mongoose.connect(config.database)
app.set('superSecret', config.secret)

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(morgan('dev'))

app.get('/', (req, res) => {
  client.ping({
    requestTimeout: 3000
  }, (err) => {
    if (err) {
      console.log(err)
    } else {
      console.log('Everything is okay')
    }

  })
  res.send('Hello! The API is at http://localhost:' + port + '/api')
})

app.get('/setup', (req, res) => {
  const marios = {
    index: 'users',
    type: 'user',
    id: 'marios3000',
    body: {
      username: 'marios3000',
      password: 'password',
      admin: true
    }
  }

  client.index(marios, (err, res, status) => {
    if (err) {
      console.error(err)
    } else {
      console.log(res)
    }
  })
  res.json({success: true, message: 'YEAH!'})
})

// API ROUTES -------------------

// get an instance of the router for api routes
const apiRoutes = express.Router()

// TODO: route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', (req, resp) => {
  let name
  let password = ''
  client.get({
    index: 'users',
    type: 'user',
    id: req.body.name
  }).then((res) => {
    name = res._source.username
    password = res._source.password
    admin = res._source.admin

    if (name) {
      if (password !== req.body.password) {
        resp.json({success: false, message: 'Wrong password'})
      } else {

        const payload = {
          admin: admin
        }

        const token = jwt.sign(payload, app.get('superSecret'), {
          expiresIn: '1 days'
        })

        resp.json({
          success: true,
          message: 'Enjoy your token',
          token: token
        })
      }
    }
  }, (err) => {
    console.trace(err.message)
    resp.json({success: false, message: 'User not found'})
  })

})

// TODO: route middleware to verify a token
apiRoutes.use((req, res, next) => {
  const token = req.body.token || req.query.token || req.headers['x-access-token']

  if (token) {
    jwt.verify(token, app.get('superSecret'), (err, decoded) => {
      if (err) {
        return res.json({success: false, message: 'Failed to authenticate'})
      } else {
        req.decoded = decoded
        next()
      }
    })
  } else {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    })
  }
})

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function (req, res) {
  res.json({message: 'Welcome to the coolest API on earth!'})
})

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.get('/users', function (req, res) {
  User.find({}, function (err, users) {
    res.json(users)
  })
})

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes)

app.listen(port)
console.log('Magic happens at at http://localhost:' + port + '/api')