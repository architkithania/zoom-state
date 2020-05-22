# ZoomState - Cross device state management system

ZoomState is a simple cross device state management system. ZoomState is **NOT** yet another web server library, rather it integrates cleanly with existing server libraries such as the standard Http package or Express. It allows clients to connect to it and synchronizes state amongst the devices. ZoomState provides a convenient API for clients to interact with the server so that clients can rapidly develop applications.



## Motivation

The motivation behind this project is to create an abstract solution to a wide set of problems focused towards data synchronization between clients. These problems range from applications such as chatting applications to more extreme applications such as multilayer games. Users can easily integrate ZoomState with their applications to add a new dimension of real time client-to-client communication.



ZoomState models state like the way the UI library, React, does. The state is a pure object that others can subscribe. This allows for applications that can essentially have clients react to changes made by another device.

## Features

ZoomState provides useful functionalities such as:

1. Managing a simple API so clients can registered and authenticated
2. Expose functions to create new states. These functions can easily be wrapped in an endpoint so that clients can register new states.
3. Utilizes the industry standard [JSON-Schema](https://json-schema.org/) to allow users to easily create extremely well defined states that follow users to create precise schema.
4. Validate passed states using the JSON-Schema to ensure state integrity.
5. Allow clients to set state and get notification to states in real time.
6. Allow users to subscribe and unsubscribe from different states.
7. Allow users to subscribe to multiple states at a time.



Currently ZoomState requires clients to interact directly with WebSockets but Client SDKs are in development to abstract away this process so that true *React Like* state management can be achieved.



## Installation

The easiest way to install the package is through `npm`:

```bash
npm install zoom-state
```



You can also manually clone the repo and use the files as well. To clone the repo do the following:

```bash
git clone https://www.github.com/architkithania/zoom-state
```

Next build the project (as it uses typescript)

```bash
npm run build
```

You now have access to all the files for this library in the `dist` folder. The entry point to this application is the `state-server.js`



## Examples

#### Server Side

The following is how you can integrate ZoomState with an [Express](https://expressjs.com/) application. (Similar steps apply for other web servers).

```javascript
import express from "express"
import bodyParser from "body-parser";
import http from "http"

import { StateServer } from "zoom-state";
const PORT = process.env.PORT || 8000

const app = express()
const httpServer = http.createServer(app)

// The following *MUST* run before any other express/http code
// Create a new state server instance.
const stateServer = new StateServer(httpServer)
// Path and port at which the state server should expose state management.
// Optionally, a port argument can be provided for the WebSocket server. If
// Not provided, web socket server runs on the same port as the http server
stateServer.initWebSocketServer("/ws")

// Initialise your application as needed
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// Exposed endpoint to allow users to create states
app.get("/new-state", (req, res) => {
  // Note: You should do some request verifciation
  const schema = req.body.schema 			 // JSON-schema
  const initialState = req.body.initialState // Object abiding to the the JSON-Schema
  const stateId = req.body.stateId			 // The name of the state

  if (!stateServer.createState(stateId, schema, initialState)) {
    // There was an error in schema, initial state, or state id already in use
    res.status(400).send("error in schema or initial state")
    return;
  }

  // Success! State successfully Created.
  res.send(stateId)
})

app.get("/new-user", (req, res) => {
  // Register a new user. Do some middleware authentication if required
  res.send(stateServer.createClient())
})

httpServer.listen(PORT, () => {
  console.log(`Hosted on http://localhost:${PORT}`)
})
```



#### Client Side

**Creating States**

The state creator above is wrapped in an HTTP. Suppose we want to create a state called `my-state` with the following schema:

```json
{
    "type": "object",
    "properties": {
        "stateValue1": { "type": "number" },
        "stateValue2": { "type": "string" },
    },
    "additionalProperties": false
}
```

Any valid JSON-definition is a valid schema for the state. This provides the clients immense flexibility in designing the right data structure for their needs. Check the Scheme-Design suggestions below.

#### Acquiring a Client ID

Before you may interact with the state service, you must acquire a valid client id. Note that the definition of valid client id is **NOT** enforced by ZoomState but is rather left to the Web Server to design, store, and enforce. Using our above example, we can simply acquire a client id by issuing a `GET` request:

```javascript
const res = await fetch('http://localhost:8000/new-user')
const userId = await res.text() 	
```

#### Subscribing to a service

Users can now subscribe to a state using web sockets. (Note: This is temporary. A client SDK is getting created to abstract away this process)

```javascript
const subscribeMessage = {
    manager: "client",
    data: {
        type: "subscribe",
        clientId: userId, 		// userId obtained from above
        stateId: "my-state" 	// state you want to subscribe to
    }
}

// Lets create a websocket and subscribe to the state

const ws = new WebSocket("ws://localhost:8080/ws")

// define the function that should trigger when you recieve a new state. We will
// keep it simple and just log the recieved state
ws.onmessage = (state) => console.log(state)

ws.send(JSON.stringify(subscribeMessage))
```

#### Getting the current state

We can get the current state by passing the following message to the web socket

```javascript
const getStateMessage = {
    manager: "state",
    data: {
        type: "get-state",
        stateId: "my-state" 	// state you want to subscribe to
    }
}

ws.send(JSON.stringify(getStateMessage))

// We will see the following print (because our ws.onmessage simply prints the state)
//
//{
//	clients: ['some-client-id'], 
//	state: { 
//        stateValue1: <some-number>,
//        stateValue2: "some-string",
//    }
// }
```

Note that the current clients subscribed get sent in each state automatically even though it wasn’t specified in the JSON-schema.

#### Setting the state

```javascript
const setStateMessage = {
    manager: "state",
    data: {
        type: "set-state",
        stateId: "my-state",	// state you want to subscribe to
        state: {
        	stateValue1: 11
    	}
    }
}

ws.send(JSON.stringify(setStateMessage))

// We will see the following print (because our ws.onmessage simply prints the state)
//
//{
//	clients: ['some-client-id'], 
//	state: { 
//        stateValue1: 11,
//        stateValue2: "some-string",
//    }
// }
```

Note that in our `state` property in the `setStateMessage` object, we did not have to explicitly set the current value of the state for those values that we didn’t want to change. We only need to specify the values we do want to set and ZoomState takes care of the rest.

Note the new state gets echoed back to us as every `set-state` notifies all connected users, including our selves.

## Scheme-Design Suggestions

ZoomState gives users complete flexibility in specifying the JSON format that they feel comfortably depicts their use case. The following is just suggestions that are believed to result in more manageable state design.

#### Use the `additionalProperties: false` flag

We recommend that each schema includes the `additionalProperties: false` flag so that users don’t add more values after to a state has been created. This prevents new state values from mistakenly being added and also forces users to think about their requirements before hand.

#### Do not use the `minProperties` flag.

The use of `minProperties` flag prevents users from setting only a part of the state. This often forces users to get the current state and then issue a new state to change only a certain value. Not only is this less efficient but may create race conditions between concurrent state updates. Please think carefully before using this flag.

## Road Map and Planned Changes for the Future

ZoomState is far from finished. There are a lot of things that can be added and improved. The following are just some ideas for future change

1. Add a client SDK
2. Allow users to set state without getting an echo themselves
3. Clean up the overall API
4. Add better documentation