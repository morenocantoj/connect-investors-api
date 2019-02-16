import { Criterias } from './db'
import to from 'await-to-js'

export const resolvers = {
  Query: {
    helloGraphQL: (root) => {
      return "Hello World!"
    },
    getCriterias: async (root, {limit, offset}) => {
      let err, criterias
      [err, criterias] = await to(Criterias.find({}).limit(limit).skip(offset))

      if (err) return new Error('Error ocurred while retrieving criterias!')

      return (criterias)
    }
  },
  Mutation: {
    createCriteria: async (root, {input}) => {
      const newCriteria = new Criterias({
        text: input.text,
        icon: input.icon,
        key: input.key
      })
      // MongoDB creates a default ID
      newCriteria.id = newCriteria._id

      let err, savedCriteria

      // Save new criteria
      [err, savedCriteria] = await to(newCriteria.save())
      if (err) return new Error('Error ocurred while saving criteria!')

      return (savedCriteria)
    }
  }
}
