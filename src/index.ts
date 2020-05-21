import express from "express"
import bodyParser from "body-parser";
import http from "http"
import Joi from "@hapi/joi"

import StateServer from "./state-server";
const PORT = process.env.PORT || 8000
const STATE_PORT = process.env.STATE_PORT || 8080

const app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

const stateServer = new StateServer(http.createServer(app))
stateServer.initWebSocketServer("/ws", STATE_PORT)

app.get("/", (req, res) => {
  res.send("Hello World")
})

app.get("/new-state", (req, res) => {
  const schema = Joi.object({
    "stateId": Joi.string().max(10).required(),
    "clientId": Joi.string().required(),
    "schema": Joi.object().keys().unknown().required(),
    "initialState": Joi.object().keys().unknown().required()
  })

  const { value, error } = schema.validate(req.body)
  if (error) {
    res.status(400).json(error.details.map(error => error.message + "\n"))
    return
  }

  if (!stateServer.createState(value.stateId, <JSON>value.schema, <JSON>value.initialState)) {
    res.status(400).send("error in schema or initial state")
    return;
  }
  res.send(value.stateId)
})

app.get("/new-user", (req, res) => {
  res.send(stateServer.createClient())
})

app.listen(PORT, () => {
  console.log(`Hosted on http://localhost:${PORT}`)
})
