import { expect } from 'chai'
import './../configTestEnvironment'
import {testRouteCreate, testRouteGet} from './../../src/routes/testRoute'
import {createRequestFromBlueprint} from './../testApiGatewayRequest'


describe('testRoute function', () => {
    it('should return new item on create', () => {
      const result = testRouteCreate()( createRequestFromBlueprint({}) )
      return result.then((r) => {
          expect(r.statusCode).to.equal(200)
          expect(JSON.parse(r.body).id).to.not.be.empty
      })
    })

    it('should return new item on get after create', () => {
      const result = testRouteCreate()( createRequestFromBlueprint({}) )
      return result.then((r) => {
          const id = JSON.parse(r.body).id
          const result = testRouteGet()( createRequestFromBlueprint({}, {id: id}))
          return result.then((r) => {
            expect(r.statusCode).to.equal(200)
            expect(JSON.parse(r.body).id).to.be.equal(id)
          })
      })
    })

    it('should return 404 in random id', () => {
      const result = testRouteGet()( createRequestFromBlueprint({}, {id: Math.random()}) )
      return result.then((r) => {
          expect(r.statusCode).to.be.equal(404)
      })
    })
  })