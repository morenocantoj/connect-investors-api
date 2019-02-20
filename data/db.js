import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config({path: './.env'})

mongoose.Promise = global.Promise

mongoose.connect(String(process.env.DATABASE_URL), {useNewUrlParser: true})
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
  role: String,
  possible_invest: Array
})

// Middleware to hash passwords before save them
userSchema.pre('save', function(next) {
  // If password is not modified don't hash it again
  if (!this.isModified('password')) return next()

  bcrypt.genSalt(10, (err, salt) => {
    if(err) return next(err)

    bcrypt.hash(this.password, salt, (err, hash) => {
      if (err) return next(err)

      // If all is ok save the new hash as password
      this.password = hash
      next()
    })
  })
})

const Users = mongoose.model('users', userSchema)

// Company Schema
const companySchema = new mongoose.Schema({
  name: String,
  url: String,
  ceo_name: String,
  email: String,
  telephone: String
})

const Companies = new mongoose.model('companies', companySchema)

export { Criterias, Users, Companies }
