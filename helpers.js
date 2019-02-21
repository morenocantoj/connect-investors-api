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
    if (err) throw new Error("Error updating user's company")
  })
  return true
}

export const answerUserCompanyCriteria = (user, inputData) => {
  let promise = null
  let answer = null

  // Iterate for each user's company and set the new answer to the correct criteria
  user.possible_invest.forEach((companyStatus) => {
    if (companyStatus.company._id == inputData.id) {
      // Set answer
      companyStatus.answers.forEach((answerObj) => {
        if (answerObj.key === inputData.key) {
          answerObj.answer = inputData.answer
          answer = answerObj

          return
        }
      })
      return
    }
  })

  if(answer !== null) {
    user.save()
  }

  return answer
}

export const getUserCompanyCriterias = (user, id, typeCriteria) => {
  let allAnswers = []

  user.possible_invest.forEach((statusCompany) => {
    if (statusCompany.company._id == id) {
      allAnswers = statusCompany.answers
      return
    }
  })

  if (!allAnswers) throw new Error(`Unable to find company ${id}`)

  // Filter criterias by its type
  const filteredAnswers = allAnswers.filter((item) => {
    return item.type == typeCriteria
  })

  return filteredAnswers
}

export const statsUserCompanyCriterias = (user, id, typeCriteria) => {
  let allAnswers = []

  user.possible_invest.forEach((statusCompany) => {
    if (statusCompany.company._id == id) {
      allAnswers = statusCompany.answers
      return
    }
  })

  if (!allAnswers) throw new Error(`Unable to find company ${id}`)

  // Filter criterias by its type
  const filteredAnswers = allAnswers.filter((item) => {
    return item.type == typeCriteria
  })

  // Get stats of answers
  let countAgree = 0, countNo = 0, countDontKnow = 0
  filteredAnswers.forEach((item) => {
    switch (item.answer) {
      case "Y":
        countAgree = countAgree + 1
        break
      case "N":
        countNo = countNo + 1
        break
      case "DN":
        countDontKnow = countDontKnow + 1
        break
    }
  })

  return {
    answered_y: countAgree,
    answered_n: countNo,
    answered_dn: countDontKnow,
    total: filteredAnswers.length
  }
}
