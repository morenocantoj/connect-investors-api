import app from '../index'

import supertest from 'supertest';
import assert from 'assert';

// Collections
import { Criterias } from '../data/db'

// URLs
const api_url = '/'
const graphql_url = '/graphql'

function chk(err, done) {
  if (err) {
    console.log(err)
    done()
  }
}
// Check error for async testing
function chk_a(err) {
  if (err) {
    console.log(err)
  }
}

describe("Foundernest API test suite", () => {
  it("Initial test (deleted deprecated route)", (done) => {
    supertest(app)
    .get(api_url)
    .expect(404, done)
  })
  it("GraphQL initial test", (done) => {
    supertest(app)
    .post(graphql_url)
    .send({
      query: `{
        helloGraphQL
      }`
    })
    .set('Content-Type', 'application/json')
    .expect(200)
    .end(function(err, resp) {
      chk(err, done)
      assert.equal(resp.body.data.helloGraphQL, 'Hello World!')
      done()
    })
  })
  it("Create a new Criteria object", async () => {
    const newCriteria = new Criterias({
      text: "CEO full-time",
      key: "CEO_FULL_TIME",
      icon: "car"
    })
    newCriteria.id = newCriteria._id

    // Create and retrieve the new criteria
    const createdCriteria = await newCriteria.save()
    const savedCriteria = await Criterias.findById(createdCriteria.id)

    assert.equal(savedCriteria.text, 'CEO full-time')
    assert.equal(savedCriteria.key, 'CEO_FULL_TIME')

  })
  it("Create a new Criteria object without async/await", () => {
    const newCriteria = new Criterias({
      text: "CEO full-time",
      key: "CEO_FULL_TIME",
      icon: "car"
    })
    newCriteria.id = newCriteria._id

    // Create a new criteria
    return new Promise((resolve, reject) => {
      newCriteria.save((error) => {
        if (error) reject(error)
        else resolve(newCriteria)
      })
    }).then((newCriteria) => {
      // Check if criteria has been created
      return new Promise((resolve, reject) => {
        Criterias.findById(newCriteria.id, (error, criteria) => {
          if (error) reject(error)
          else resolve(criteria)
        })
      }).then((criteria) => {
        assert.equal(criteria.text, 'CEO full-time')
        assert.equal(criteria.key, 'CEO_FULL_TIME')
      })
    })
  })
  it("Create a new Criteria with Mutation", (done) => {
    supertest(app)
    .post(graphql_url)
    .send({
      query: `mutation createCriteria($input: CriteriaInput) {
        createCriteria(input: $input) {
          id
          text
          key
          icon
        }
      }`,
      variables: {
        "input": {
          "text": "CTO full-time",
          "key": "CTO_FULL_TIME",
          "icon": "cloud"
        }
      }
    })
    .set('Content-Type', 'application/json')
    .expect(200)
    .end((err, resp) => {
      chk_a(err, done)
      assert(resp.body.data.createCriteria.text, "CTO full-time")
      assert(resp.body.data.createCriteria.key, "CTO_FULL_TIME")
      assert(resp.body.data.createCriteria.icon, "cloud")
      done()
    })
  })
  it("Get all criterias", (done) => {
    supertest(app)
    .post(graphql_url)
    .send({
      query: `{
        getCriterias{
          id
          text
        }
      }`,
    })
    .set('Content-Type', 'application/json')
    .expect(200)
    .end((err, resp) => {
      chk(err, done)
      assert.notEqual(resp.body.data.getCriterias, undefined)
      assert.notEqual(resp.body.data.getCriterias.length, 0)
      assert.notEqual(resp.body.data.getCriterias.length, null)
      done()
    })
  })
  it("Get all criterias with limit and offset", (done) => {
    supertest(app)
    .post(graphql_url)
    .send({
      query:
      `query getCriterias($limit: Int, $offset: Int){
        getCriterias(limit: $limit, offset: $offset){
          id
          text
        }
      }`,
      variables: {
        "limit": 2,
        "offset": 1
      }
    })
    .set('Content-Type', 'application/json')
    .expect(200)
    .end((err, resp) => {
      chk(err, done)
      assert.notEqual(resp.body.data.getCriterias, undefined)
      assert.notEqual(resp.body.data.getCriterias.length, 0)
      assert.notEqual(resp.body.data.getCriterias.length, null)
      assert(resp.body.data.getCriterias.length, 2)
      done()
    })
  })
})
