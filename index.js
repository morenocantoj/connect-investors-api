import express from 'express'

// GraphQL Server
import { ApolloServer } from 'apollo-server-express'
import { typeDefs } from './data/schema'
import { resolvers } from './data/resolvers'

const app = express()
const server = new ApolloServer({typeDefs, resolvers})
const port = 4000

server.applyMiddleware({app})

app.listen({port}, () => {
  console.log("Server running..." )
})

export default app
