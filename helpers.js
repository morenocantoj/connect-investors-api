import { Users } from './data/db'
import to from 'await-to-js'

export const checkUserInDatabase = async (userInput) => {
  // Check if user already exists in database
  let err, existingUser
  [err, existingUser] = await to(Users.findOne({email: userInput.email}))

  if (err) return new Error('Error ocurred while checking if user already exists')

  // If an object is returned, it means we have already an existing user
  if (existingUser) return true

  return false
}
