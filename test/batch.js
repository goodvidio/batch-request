'use strict';

process.env.NODE_ENV = 'test';

var Chance = require('chance');
var chance = new Chance();
var expect = require('chai').expect;
var request = require('supertest');

describe('batch', function () {

    var app;
    var batch;

    before(function (done) {

        app = require('./helpers/app')();
        batch = require('../lib/batch-request')();
        done();
    });

    after(function (done) {

        app.server.close(done);
    });

    describe('basic', function () {

        it('looks good', function () {

            expect(batch).to.be.a('function');
        });
    });

    describe('test our app helper', function () {

        it('has a /users/1/name endpoint', function (done) {

            request(app)
                .get('/users/1/name')
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body).to.exist;
                    done();
                });
        });
    });

    describe('basic', function () {

        it('can handle a single request, without a method', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: 'http://localhost:3000/users/1/name'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    done();
                });
        });

        it('can batch to a relative path', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: '/users/1/name'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    done();
                });
        });

        it('will handle a POST correctly', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    method: 'POST',
                    url: 'http://localhost:3000/users/1/name'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    done();
                });
        });

        it('will handle a POST with a body correctly', function (done) {

            var first = chance.first();
            request(app)
                .post('/batch')
                .send([{
                    method: 'POST',
                    body: {
                        first: first
                    },
                    json: true,
                    url: 'http://localhost:3000/users/1/name'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    expect(res.body[0].body).to.equal(first);
                    done();
                });
        });

        it('will handle a PUT correctly', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    method: 'PUT',
                    url: 'http://localhost:3000/users/1/name'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    done();
                });
        });

        it('will handle deeply serialized objects on POST correctly', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    method: 'POST',
                    url: 'http://localhost:3000/users/1/deep'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    var obj = JSON.parse(res.body[0].body);
                    expect(obj.mixed.deep.foo).to.equal('bar');
                    done();
                });
        });

        it('will send back headers', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    method: 'POST',
                    url: 'http://localhost:3000/users/1/deep'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    expect(res.body.length).to.equals(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    expect(res.body[0]).to.have.property('headers');
                    var obj = JSON.parse(res.body[0].body);
                    expect(obj.mixed.deep.foo).to.equal('bar');
                    done();
                });
        });

        describe('can handle multiple requests', function () {

            it('without a method', function (done) {

                request(app)
                    .post('/batch')
                    .send([{
                        url: 'http://localhost:3000/users/1/name'
                    }, {
                        url: 'http://localhost:3000/users/1/email'
                    }, {
                        url: 'http://localhost:3000/users/1/company'
                    }])
                    .expect(200, function (err, res) {

                        expect(err).to.not.exist;
                        expect(res.body.length).to.equals(3);
                        expect(res.body[0].statusCode).to.equal(200);
                        expect(res.body[0].body).to.be.a('string');
                        expect(res.body[1].statusCode).to.equal(200);
                        expect(res.body[1].body).to.be.a('string');
                        expect(res.body[2].statusCode).to.equal(200);
                        expect(res.body[2].body).to.be.a('string');
                        done();
                    });
            });

            it('one of which is bogus', function (done) {

                request(app)
                    .post('/batch')
                    .send([{
                        url: 'http://localhost:3000/users/1/name'
                    }, {
                        url: 'http://localhost:3000/users/1/' + chance.word()
                    }, {
                        url: 'http://localhost:3000/users/1/company'
                    }])
                    .expect(200, function (err, res) {

                        expect(err).to.not.exist;
                        expect(res.body.length).to.equals(3);
                        expect(res.body[0].statusCode).to.equal(200);
                        expect(res.body[0].body).to.be.a('string');
                        expect(res.body[1].statusCode).to.equal(404);
                        expect(res.body[2].statusCode).to.equal(200);
                        expect(res.body[2].body).to.be.a('string');
                        done();
                    });
            });
        });
    });

    describe('dependencies', function () {

        it.skip('will run multiple queries in parallel if no dependencies specified', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: 'http://localhost:3000/users/1/hammertime'
                }, {
                    url: 'http://localhost:3000/users/1/hammertime'
                }, {
                    url: 'http://localhost:3000/users/1/hammertime'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    var now = new Date().getTime();
                    expect(res.body[0].body).to.be.within(now - 100, now + 100);
                    expect(res.body[1].body).to.be.within(now - 100, now + 100);
                    expect(res.body[2].body).to.be.within(now - 100, now + 100);
                    done();
                });

        });

        it.skip('will run a dependency before its dependent', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    dependency: 'time1',
                    url: 'http://localhost:3000/users/1/hammertime'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    var now = new Date().getTime();
                    // Expect first one to finish within
                    expect(res.body[0].body).to.be.within(now - 1000, now + 1000);
                    expect(res.body[1].body).to.be.above(res.body.time1.body + 500);
                    done();
                });

        });

        it.skip('will not choke on an empty string dependency', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    dependency: '',
                    url: 'http://localhost:3000/users/1/hammertime'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    // Expect first one to finish within
                    expect(res.body[0].body).to.be.ok;
                    expect(res.body[1].body).to.be.ok;
                    done();
                });

        });

        it.skip('will run chained dependencies, in order', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: 'http://localhost:3000/users/1/hammertime'
                }, {
                    dependency: 'time1',
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    dependency: 'time2',
                    url: 'http://localhost:3000/users/1/delay'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    var now = new Date().getTime();
                    expect(res.body[0].body).to.be.within(now - 1100, now + 1100);
                    expect(res.body[1].body).to.be.above(res.body.time1.body + 999);
                    expect(res.body[2].body).to.be.above(res.body.time2.body + 999);
                    done();
                });

        });

        it.skip('can run a rather complex chain of dependencies, in order', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: 'http://localhost:3000/users/1/hammertime'
                }, {
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    url: 'http://localhost:3000/users/1/hammertime'
                }, {
                    dependency: 'time1',
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    dependency: 'time4',
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    dependency: 'time4',
                    url: 'http://localhost:3000/users/1/delay'
                }, {
                    dependency: 'time4',
                    url: 'http://localhost:3000/users/1/delay'
                }])
                .expect(200, function (err, res) {

                    expect(err).to.not.exist;
                    var now = new Date().getTime();
                    expect(res.body[0].body).to.be.within(now - 1100, now + 1100);
                    expect(res.body[1].body).to.be.above(res.body[0].body + 999);
                    expect(res.body[2].body).to.be.above(res.body[1].body + 999);
                    expect(res.body[3].body).to.be.above(res.body[0].body + 999);
                    expect(res.body[4].body).to.be.above(res.body.time4.body + 999);
                    expect(res.body[5].body).to.be.above(res.body.time4.body + 999);
                    expect(res.body[6].body).to.be.above(res.body.time4.body + 999);
                    done();
                });

        });
    });
});
