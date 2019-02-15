import express from 'express'

const app = express()

// Main route
app.get('/', (req, res) => {
  res.send('Initial setting!')
})

app.listen(8000, () => {
  console.log('Server running...')
})

export default app
