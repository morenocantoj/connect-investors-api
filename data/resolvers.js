import { Criterias, Users, Companies } from './db'
import to from 'await-to-js'
import bcrypt from 'bcrypt'

// JWT
import dotenv from 'dotenv'
dotenv.config({path: './.env'})

import jwt from 'jsonwebtoken'

const createToken = (loginUser, secret, expiresIn) => {
  // Get unique email and role from user login
  const {email, role} = loginUser

  return jwt.sign({email, role}, secret, {expiresIn})
}

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
    },
    obtainUser: async (root, args, {actualUser}) => {
      if (!actualUser) return null

      // Obtain actual user logged
      const user = await Users.findOne({email: actualUser.email})

      return (user)
    }
  },
  Mutation: {
    // Criteria mutations
    createCriteria: async (root, {input}, {actualUser}) => {
      // You can create a criteria if you are an admin or an investor
      if (!actualUser) throw new Error("You're not logged in!")

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
    },
    // User mutations
    createUserAdmin: async (root, {input}, {actualUser}) => {
      // Check permissions
      if (!actualUser || actualUser.role !== "ADMIN") throw new Error("You are not allowed to do this")

      // Check if user already exists in database
      let err, existingUser
      [err, existingUser] = await to(Users.findOne({email: input.email}))

      if (err) return new Error('Error ocurred while checking if user already exists')
      // If an object is returned, it means we have already an existing user
      if (existingUser) return new Error('User already exists in database')

      // Create the new user and save it
      const newUser = new Users({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role
      })

      let savedUser
      [err, savedUser] = await to(newUser.save())

      if (err) return new Error('Error ocurred while saving new user')
      return (savedUser)
    },
    authenticateUser: async (root, {email, password}) => {
      // Check if user exists in database
      let err, user

      [err, user] = await to(Users.findOne({email: email}))
      if(err) throw new Error('Error ocurred while checking if user exists')
      if (!user) throw new Error('User does not exist')

      // Check if both passwords match
      let correctPassword

      [err, correctPassword] = await to(bcrypt.compare(password, user.password))
      if (err) throw new Error('Error while checking if passwords match')
      if (!correctPassword) throw new Error('Incorrect password')

      // Passwords match!
      return {
        token: createToken(user, process.env.SECRET, '1hr')
      }
    }
  }
}
