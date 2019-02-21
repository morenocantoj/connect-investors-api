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

export const passCompanyToPhase = async(userId, companyId, phase) => {
  let err, user

  [err, user] = await to(Users.findById({"_id": userId}))
  if (err) throw new Error("Error retrieving data")

  // Search specific element
  for (let i=0; i<user.possible_invest.length; i++) {
    if (user.possible_invest[i].company._id == companyId) {
      // Update this company
      user.possible_invest[i].key = phase.key
      user.possible_invest[i].status = phase.status

      user.save((err) => {
        if (err) throw new Error("Error updating user's company")
      })

      return true
    }
  }
  return false
}

export const addSelectedCriteriaToUser = async(user, criteria, criteriaAnswer) => {
  // Add new selected criteria to the user
  user.criterias.push(criteria)

  // Iterate for each user's company and set the new criteria
  user.possible_invest.map((companyStatus) => {
    companyStatus.answers.push(criteriaAnswer)
  })

  // Save changes
  user.save((err) => {
    console.log(err)
    if (err) throw new Error("Error updating user's company")
  })
  return true
}
