import { Criterias, Users, Companies } from './db'
import { checkUserInDatabase } from '../helpers'
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
    },
    getCompanies: async (root, {limit, offset}, {actualUser}) => {
      if (!actualUser) throw new Error("You're not logged in!")

      // Obtain all available companies
      let err, companies
      [err, companies] = await to(Companies.find({}).limit(limit).skip(offset))

      if (err) return new Error('Error ocurred while retrieving companies!')

      return companies
    },
    getCompany: async (root, {id}, {actualUser}) => {
      if (!actualUser) throw new Error("You're not logged in")

      // Obtain the company
      let err, company

      [err, company] = await to(Companies.findById(id))
      if (err) throw new Error("Error retrieving the company!")

      return company
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
      const userExists = await checkUserInDatabase(input)
      if (userExists) return new Error('User already exists in database')

      // Create the new user and save it
      const newUser = new Users({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role
      })

      let err, savedUser
      [err, savedUser] = await to(newUser.save())

      if (err) return new Error('Error ocurred while saving new user')
      return (savedUser)
    },
    registerInvestor: async (root, {input}) => {
      // Check if user already exists in database
      const userExists = await checkUserInDatabase(input)
      if (userExists) return new Error('User already exists in database')

      // Get all existing companies and add them to the new investor
      let err, companies
      [err, companies] = await to(Companies.find({}))

      if (err) return new Error('Error ocurred while retrieving companies!')

      // Register a new INVESTOR
      const newUser = new Users({
        name: input.name,
        email: input.email,
        password: input.password,
        role: "INVESTOR",
        possible_invest: companies
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
    },
    createCompany: async(root, {input}) => {
      const newCompany = new Companies({
        name: input.name,
        ceo_name: input.ceo_name,
        url: input.url,
        email: input.url,
        telephone: input.telephone
      })
      newCompany.id = newCompany._id

      // Add this new company to all investors' possible invest array
      let err, investors

      [err, investors] = await to(Users.find({role: "INVESTOR"}))
      if (err) throw new Error('Error ocurred while retrieving users')

      investors.map((investor) => {
        investor.possible_invest.push(newCompany)
        // We don't need to wait
        investor.save()
      })

      // Save the new company
      let savedCompany

      [err, savedCompany] = await to(newCompany.save())
      if (err) throw new Error('Error ocurred while creating a new company')

      return savedCompany
    },
    deleteCompany: async(root, {id}) => {
      const err = await Companies.findOneAndDelete({id: id})
      if (err) throw new Error('Error deleting company')

      return true
    }
  }
}
