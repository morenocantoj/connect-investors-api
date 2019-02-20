import app from '../index'

import supertest from 'supertest';
import assert from 'assert';

import mongoose from 'mongoose'

import dotenv from 'dotenv'
dotenv.config({path: './.env'})

// Collections
import { Criterias, Users, Companies } from '../data/db'

// Faker mock
import faker from 'faker'

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

// Token to use it in the tests
let tokenAdmin

describe("Foundernest API test suite", () => {
  before(() => {
    // Connect database to a different URL when local tests
    if (process.env.NODE_ENV === 'develop') {
      mongoose.connect(String(process.env.DATABASE_URL_TEST), {useNewUrlParser: true}, () => {
        // Drop database before doing tests
        mongoose.connection.db.dropDatabase(() => {
          mongoose.set('setAndModify', false)
        })
      })
    }
   })
   // ** -- Tests -- ** //
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
  describe("/** -- User Tests -- **/", () => {
    it('Create a new User object', async () => {
      const ryan = new Users({
        name: "James Francis Ryan",
        email: "private.ryan@example.com",
        password: "plainexample",
        role: "ADMIN"
      })
      ryan.id = ryan._id

      const createdRyan = await ryan.save()
      const savedRyan = await Users.findById(createdRyan.id)

      assert(createdRyan.name, ryan.name)
      assert(createdRyan.email, ryan.email)
      assert(createdRyan.password, ryan.password)
      assert(createdRyan.role, ryan.role)
    })
    it('Mutation to login an existing user', (done) => {
      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `mutation authenticateUser($email: String!, $password: String!) {
              authenticateUser(email: $email, password: $password) {
                token
              }
            }`,
        variables: {
          "email": "private.ryan@example.com",
          "password": "plainexample"
        }
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .end((err, resp) => {
        chk(err, done)
        assert.notEqual(resp.body.data.authenticateUser.token, undefined)
        done()
      })
    })
    it('Mutation to create a new user (ADMIN)', (done) => {
      const name = faker.name.findName()
      const email = faker.internet.email()
      const password = faker.internet.password()

      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `mutation authenticateUser($email: String!, $password: String!) {
              authenticateUser(email: $email, password: $password) {
                token
              }
            }`,
        variables: {
          "email": "private.ryan@example.com",
          "password": "plainexample"
        }
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .end((err, resp) => {
        chk(err, done)

        // Real test begins now!
        tokenAdmin = resp.body.data.authenticateUser.token

        supertest(app)
        .post(graphql_url)
        .send({
          query: `mutation createUserAdmin($input: UserInput!) {
            createUserAdmin(input: $input) {
              name
              email
              role
            }
          }`,
          variables: {
            "input": {
              "name": name,
              "email": email,
              "password": password,
              "role": "ADMIN"
            }
          }
        })
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer ' + tokenAdmin)
        .expect(200)
        .end((err, resp) => {
          chk(err, done)
          assert(resp.body.data.createUserAdmin.name, "John Doe")
          assert(resp.body.data.createUserAdmin.email, "john.doe@example.com")
          assert(resp.body.data.createUserAdmin.role, "ADMIN")
          done()
        })
      })
    })
    it('Mutation to login an existing user wrong password', (done) => {
      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `mutation authenticateUser($email: String!, $password: String!) {
              authenticateUser(email: $email, password: $password) {
                token
              }
            }`,
        variables: {
          "email": "private.ryan@example.com",
          "password": "WE_MISSED_PRIVATE_RYAN"
        }
      })
      .set('Content-Type', 'application/json')
      .end((err, resp) => {
        chk(err, done)
        assert.equal(resp.body.errors[0].message, 'Incorrect password')
        done()
      })
    })
    it("Mutation to register as a new INVERSOR", () => {
      const name = faker.name.findName()
      const email = faker.internet.email()
      const password = faker.internet.password()

      // A company is needed
      const newCompany = new Companies({
        name: faker.company.companyName(),
        ceo_name: faker.name.findName(),
        url: faker.internet.url(),
        email: faker.internet.email(),
        telephone: faker.phone.phoneNumberFormat()
      })
      newCompany.id = newCompany._id

      return new Promise((resolve) => {
        resolve(newCompany.save())

      }).then(() => {
        supertest(app)
        .post(graphql_url)
        .send({
          query:
            `mutation registerInvestor($input: UserInput) {
              registerInvestor(input: $input) {
                id
                name
                email
                role
                possible_invest {
                  status
                  key
                  company {
                    name
                    ceo_name
                  }
                }
              }
            }`,
          variables: {
            "input": {
              "name": name,
              "email": email,
              "password": password,
              "role": "INVESTOR"
            }
          }
        })
        .set('Content-Type', 'application/json')
        .end((err, resp) => {
          chk_a(err)
          assert.equal(resp.body.data.registerInvestor.name, name)
          assert.equal(resp.body.data.registerInvestor.email, email)
          assert.equal(resp.body.data.registerInvestor.role, "INVESTOR")
          assert.equal(resp.body.data.registerInvestor.possible_invest[0].status, "Waiting Decision")
          assert.equal(resp.body.data.registerInvestor.possible_invest[0].key, "WAITING")
          assert.notEqual(resp.body.data.registerInvestor.possible_invest[0].company, undefined)
        })
      })
    })
  })
  describe("/** -- Criteria Tests -- **/", () => {
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
      .set('Authorization', 'Bearer ' + tokenAdmin)
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
  describe("/** -- Company Tests -- **/", () => {
    it("Create a Company model", async () => {
      const newCompany = new Companies({
        name: faker.company.companyName(),
        ceo_name: faker.name.findName(),
        url: faker.internet.url(),
        email: faker.internet.email(),
        telephone: faker.phone.phoneNumberFormat()
      })
      newCompany.id = newCompany._id

      const createdCompany = await newCompany.save()
      const savedCompany = await Companies.findById(createdCompany.id)

      assert.equal(savedCompany.name, createdCompany.name)
      assert.equal(savedCompany.ceo_name, createdCompany.ceo_name)
      assert.equal(savedCompany.url, createdCompany.url)
      assert.equal(savedCompany.email, createdCompany.email)
      assert.equal(savedCompany.telephone, createdCompany.telephone)
    })
    it("Create a Company with Mutation", (done) => {
      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `mutation createCompany($input: CompanyInput) {
            createCompany(input: $input) {
              name
              ceo_name
              telephone
              email
              id
            }
          }
          `,
        variables: {
          "input": {
            "name": "Charmeleon",
            "ceo_name": "Arancha Ferrero",
            "url": "www.charmeleon.com",
            "email": "charmeleon@startup.com",
            "telephone": "+34 599 844 233"
          }
        }
      })
      .set('Content-Type', 'application/json')
      .end((err, resp) => {
        chk(err, done)
        assert.equal(resp.body.data.createCompany.name, "Charmeleon")
        assert.equal(resp.body.data.createCompany.ceo_name, "Arancha Ferrero")
        assert.equal(resp.body.data.createCompany.telephone, "+34 599 844 233")
        assert.equal(resp.body.data.createCompany.email, "www.charmeleon.com")
        done()
      })
    })
    it("Delete a Company with Mutation", (done) => {
      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `mutation createCompany($input: CompanyInput) {
            createCompany(input: $input) {
              name
              ceo_name
              telephone
              email
              id
            }
          }
          `,
        variables: {
          "input": {
            "name": "Charmeleon",
            "ceo_name": "Arancha Ferrero",
            "url": "www.charmeleon.com",
            "email": "charmeleon@startup.com",
            "telephone": "+34 599 844 233"
          }
        }
      })
      .set('Content-Type', 'application/json')
      .end((err, resp) => {
        chk(err, done)

        const companyId = resp.body.data.createCompany.id
        // Real test
        supertest(app)
        .post(graphql_url)
        .send({
          query:
            `mutation deleteCompany($id: ID!) {
              deleteCompany(id: $id)
            }`,
          variables: {
            "id": companyId
          }
        })
        .set('Content-Type', 'application/json')
        .end((err, resp) => {
          chk(err, done)
          assert.equal(resp.body.data.deleteCompany, true)
          done()
        })
      })
    })
    it("See all companies", (done) => {
      // Create three companies
      const newCompany1 = new Companies({
        name: faker.company.companyName(),
        ceo_name: faker.name.findName(),
        url: faker.internet.url(),
        email: faker.internet.email(),
        telephone: faker.phone.phoneNumberFormat()
      })
      newCompany1.id = newCompany1._id

      const newCompany2 = new Companies({
        name: faker.company.companyName(),
        ceo_name: faker.name.findName(),
        url: faker.internet.url(),
        email: faker.internet.email(),
        telephone: faker.phone.phoneNumberFormat()
      })
      newCompany2.id = newCompany2._id

      const newCompany3 = new Companies({
        name: faker.company.companyName(),
        ceo_name: faker.name.findName(),
        url: faker.internet.url(),
        email: faker.internet.email(),
        telephone: faker.phone.phoneNumberFormat()
      })
      newCompany3.id = newCompany3._id

      // Save them
      let promises = []
      promises.push(newCompany1.save())
      promises.push(newCompany2.save())
      promises.push(newCompany3.save())

      Promise.all(promises).then((values) => {
        supertest(app)
        .post(graphql_url)
        .send({
          query:
            `query getCompanies($limit: Int, $offset: Int) {
              getCompanies(limit: $limit, offset: $offset) {
                id
                name
                ceo_name
              }
            }
            `,
          variables: {
            "limit": 2,
            "offset": 1          }
        })
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer ' + tokenAdmin)
        .end((err, resp) => {
          chk(err, done)
          assert.equal(resp.body.data.getCompanies.length, 2)
          done()
        })
      })
    })
    it("Get a specific company Query", async () => {
      // Create three companies
      const newCompany = new Companies({
        name: faker.company.companyName(),
        ceo_name: faker.name.findName(),
        url: faker.internet.url(),
        email: faker.internet.email(),
        telephone: faker.phone.phoneNumberFormat()
      })
      newCompany.id = newCompany._id

      await newCompany.save()

      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `query getCompany($id: ID!) {
            getCompany(id: $id) {
              id
              name
              ceo_name
            }
          }
          `,
        variables: {
          "id": newCompany.id
        }
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .end((err, resp) => {
        chk_a(err)
        assert.equal(resp.body.data.getCompany.id, newCompany.id)
        assert.equal(resp.body.data.getCompany.name, newCompany.name)
        assert.equal(resp.body.data.getCompany.ceo_name, newCompany.ceo_name)
      })
    })
    it("Create a Company and check if investors have this company", (done) => {
      supertest(app)
      .post(graphql_url)
      .send({
        query:
          `mutation createCompany($input: CompanyInput) {
            createCompany(input: $input) {
              name
              ceo_name
              telephone
              email
              id
            }
          }
          `,
        variables: {
          "input": {
            "name": "Zapdos",
            "ceo_name": "Basilio Contreras",
            "url": "www.zapdos.com",
            "email": "zapdos@startup.com",
            "telephone": "+34 744 444 222"
          }
        }
      })
      .set('Content-Type', 'application/json')
      .end((err, resp) => {
        chk(err, done)
        return new Promise((resolve, reject) => {
          const investors = Users.find({role: "INVESTOR"})
          resolve(investors)

        }).then((investors) => {
          investors.map((investor) => {
            assert(investor.possible_invest[investor.possible_invest.length - 1].name, "Zapdos")
            assert(investor.possible_invest[investor.possible_invest.length - 1].ceo_name, "Basilio Contreras")
            assert(investor.possible_invest[investor.possible_invest.length - 1].url, "www.zapdos.com")
            assert(investor.possible_invest[investor.possible_invest.length - 1].email, "zapdos@startup.com")
            assert(investor.possible_invest[investor.possible_invest.length - 1].telephone, "+34 744 444 222")
          })
          done()
        })
      })
    })
  })
})
