import express from 'express'

// GraphQL Server
import { ApolloServer } from 'apollo-server-express'
import { typeDefs } from './data/schema'
import { resolvers } from './data/resolvers'

// JWT
import dotenv from 'dotenv'
dotenv.config({path: './.env'})

import jwt from 'jsonwebtoken'

const app = express()
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  context: async({req}) => {
    const bearerHeader = req.headers["authorization"];

    if (typeof bearerHeader !== 'undefined') {
      // Format of Authorization header: "Bearer (token)"
      const bearer = bearerHeader.split(" ");
      const token = bearer[1];

      try {
        const actualUser = await jwt.verify(token, process.env.SECRET)

        return {
          actualUser
        }

      } catch(err) {
        throw new Error('Error decoding user token')
      }
    }
  }
})
const port = process.env.PORT || 4000

server.applyMiddleware({app})

app.listen({port}, () => {
  console.log("Server running..." )
})

export default app
