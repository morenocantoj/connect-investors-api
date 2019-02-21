import { Criterias, Users, Companies } from './db'
import { checkUserInDatabase, passCompanyToPhase, addSelectedCriteriaToUser, answerUserCompanyCriteria } from '../helpers'
import to from 'await-to-js'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'

// JWT
import dotenv from 'dotenv'
dotenv.config({path: './.env'})

import jwt from 'jsonwebtoken'

const createToken = (loginUser, secret, expiresIn) => {
  // Get unique email and role from user login
  const {id, email, role} = loginUser

  return jwt.sign({id, email, role}, secret, {expiresIn})
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
    getCompaniesFromInvestor: async (root, {limit, offset, key}, {actualUser}) => {
      if (!actualUser || actualUser.role !== "INVESTOR") {
        throw new Error("You're not allowed to see this resource")
      }

      let err, userCompanies, companies, project

      // Don't do an slice when making an aggregate
      if (!limit || !offset) {
        project = {
          _id: 0,
          possible_invest : 1
        }
      } else {
        project = {
          _id:0,
          possible_invest: {$slice: ["$possible_invest", offset, limit]}
        }
      }

      // Filter companies from this user
      if (key) {
        // Only get investor's companies those are in a certain key status
        [err, userCompanies] = await to(Users.aggregate([
          {$match: {'possible_invest.key': { $eq: key }}},
          {$match: {"email": actualUser.email}},
          {$project : project}
        ]))

      } else {
        // Obtain all companies from this investor regardless of its status
        [err, userCompanies] = await to(Users.aggregate([
          {$match: {"email": actualUser.email}},
          {$project : project}
        ]))
      }

      if (err) throw new Error("Error retrieving user from database")

      // Add the id
      userCompanies[0].possible_invest.map((statusCompany) => {
        statusCompany.company.id = statusCompany.company._id
      })
      companies = userCompanies[0].possible_invest

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

      // All companies will be pending when investor is registered
      let companiesWithStatus = []

      companies.map((company) => {
        company.id = company._id

        companiesWithStatus.push({
          status: "Waiting Decision",
          key: "WAITING",
          company: company
        })
      })

      // Register a new INVESTOR
      const newUser = new Users({
        name: input.name,
        email: input.email,
        password: input.password,
        role: "INVESTOR",
        possible_invest: companiesWithStatus
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
    addCriteriaToUser: async (root, {id, type}, {actualUser}) => {
      if (!actualUser || actualUser.role !== "INVESTOR") {
        throw new Error("You're not allowed to see this resource")
      }
      // Get user and the selected criteria
      let promises = []
      promises.push(Users.findById(actualUser.id))
      promises.push(Criterias.findById(id))

      return Promise.all(promises)
        .then(async (resolutions) => {
          const user = resolutions[0]
          const criteria = resolutions[1]

          // Create a new selected criteria for that user
          const selectedCriteria = {
            text: criteria.text,
            key: criteria.key,
            icon: criteria.icon,
            type: type
          }
          // Create a new default answer criteria
          const answerCriteriaDefault = {
            text: criteria.text,
            key: criteria.key,
            type: type,
            answer: "?"
          }

          // Apply changes to user
          const criteriaSet = await addSelectedCriteriaToUser(user, selectedCriteria, answerCriteriaDefault)
          if (criteriaSet) return selectedCriteria
        })
        .catch((err) => {
          console.log(err)
          throw new Error('Error retrieving data from database')
        })
    },
    answerUserCriteria: async(root, {id, key, answer}, {actualUser}) => {
      if (!actualUser || actualUser.role !== "INVESTOR") {
        throw new Error("You're not allowed to see this resource")
      }

      let err, user, answerResponse

      [err, user] = await to(Users.findById(actualUser.id))
      if (err) throw new Error("Error retrieving user from database")

      answerResponse = answerUserCompanyCriteria(user, {id, key, answer})
      
      return answerResponse
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
        investor.possible_invest.push({
          status: "Waiting Decision",
          key: "WAITING",
          company: newCompany
        })

        investor.save()
      })

      // Save the new company
      let savedCompany

      [err, savedCompany] = await to(newCompany.save())
      if (err) throw new Error('Error ocurred while creating a new company')

      return savedCompany
    },
    deleteCompany: async(root, {id}) => {
      const deleted = await Companies.findOneAndDelete({_id: id})
      if (!deleted) throw new Error('Error deleting company')

      // TODO: Search that company in users schema

      return true
    },
    passCompanyToFirstMeeting: async(root, {id}, {actualUser}) => {
      if (!actualUser || actualUser.role !== "INVESTOR") {
        throw new Error("You're not allowed to see this resource")
      }
      const phase = {
        key: "FIRST_MEETING",
        status: "First Meeting"
      }
      const saved = await passCompanyToPhase(actualUser.id, id, phase)

      // Not found
      if (!saved) throw new Error("No company has been found")

      return true
    },
    passCompanyToDiscarded: async(root, {id}, {actualUser}) => {
      if (!actualUser || actualUser.role !== "INVESTOR") {
        throw new Error("You're not allowed to see this resource")
      }
      const phase = {
        key: "DISCARDED",
        status: "Discarded after Screening"
      }
      const saved = await passCompanyToPhase(actualUser.id, id, phase)

      // Not found
      if (!saved) throw new Error("No company has been found")

      return true
    }
  }
}
