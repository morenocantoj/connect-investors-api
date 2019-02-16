import express from 'express'

// GraphQL Server
import { ApolloServer } from 'apollo-server-express'
import { typeDefs } from './data/schema'
import { resolvers } from './data/resolvers'

const app = express()
const server = new ApolloServer({typeDefs, resolvers})

server.applyMiddleware({app})

// Main route
app.get('/', (req, res) => {
  res.send('Deprecated...')
})

app.listen({port: 4000}, () => console.log("Server running... http://localhost:4000" + server.graphqlPath))

export default app
