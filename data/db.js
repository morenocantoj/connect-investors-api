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

export { Criterias }
