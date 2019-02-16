import { Criterias } from './db'

export const resolvers = {
  Query: {
    helloGraphQL: (root) => {
      return "Hello World!"
    }
  },
}
