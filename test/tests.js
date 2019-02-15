import app from '../index'

const supertest = require('supertest');
const assert = require('assert');
const api_url = '/'

function chk(err, done) {
  if (err) {
    console.log(err)
    done()
  }
}

describe("Foundernest API test suite", () => {
  it("Initial test", (done) => {
    supertest(app)
    .get(api_url)
    .expect(200, done)
  })
})
