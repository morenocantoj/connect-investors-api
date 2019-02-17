import mongoose from 'mongoose'

mongoose.Promise = global.Promise

mongoose.connect('mongodb://localhost/foundernest', {useNewUrlParser: true})
mongoose.set('setAndModify', false)

// Criteria Schema
const criteriaSchema = new mongoose.Schema({
  text: String,
  key: String,
  icon: String
})

const Criterias = mongoose.model('criterias', criteriaSchema)

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
})

const Users = mongoose.model('users', userSchema)

export { Criterias, Users }
