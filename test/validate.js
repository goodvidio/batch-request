'use strict';

process.env.NODE_ENV = 'test';

var Chance = require('chance');
var chance = new Chance();
var expect = require('chai').expect;
var request = require('supertest');

describe('validate', function () {

    var app;
    var appAllowed;
    var batch;

    before(function (done) {

        app = require('./helpers/app')();
        appAllowed = require('./helpers/app')({
            port: 3001,
            allowedHosts: [
                'goodvid.io',
                'localhost:3001'
            ]
        });
        batch = require('../lib/batch-request')();
        done();
    });

    after(function (done) {

        appAllowed.server.close();
        app.server.close(done);
    });

    describe('basic', function () {

        it('looks good', function () {

            expect(batch).to.be.a('function');
        });

        it('has a validate method', function () {

            expect(batch).to.have.property('validate');
            expect(batch.validate).to.be.a('function');
        });

        it('rejects non-object JSON', function (done) {

            request(app)
                .post('/batch')
                .send(chance.word())
                .expect(400, function (err, res) {

                    expect(err).to.be.null;
                    expect(res.body.error).to.exist;
                    done();
                });
        });

        it('rejects a blank request', function (done) {

            request(app)
                .post('/batch')
                .send({})
                .expect(400, function (err, res) {

                    expect(err).to.be.null;
                    expect(res.body.error).to.exist;
                    expect(res.body.error.message)
                        .to.equal('Cannot make a batch request with an empty request object');
                    done(err);
                });
        });
    });

    describe('options', function () {

        describe('allowed hosts', function () {

            it('will accept an allowed hosts parameter', function () {

                expect(require('../lib/batch-request')({
                    allowedHosts: [
                        chance.domain(),
                        chance.domain()
                    ]
                })).to.be.ok;
            });

            it('will return a validation error if allowed hosts set and request url not allowed',
                function (done) {

                    // Note, for the appAllowed app, the allowedHosts parameter contains "socialradar.com" and that's it.
                    request(appAllowed)
                        .post('/batch')
                        .send({
                            disallowedUrl: {
                                url: 'http://www.google.com'
                            }
                        })
                        .expect(400, function (err, res) {

                            expect(res.body.error).to.exist;
                            expect(res.body.error.host).to.equal('www.google.com');
                            done(err);
                        });
                });

            it('will return a validation error if allowed hosts set and one request url not allowed',
                function (done) {

                    request(appAllowed)
                        .post('/batch')
                        .send([{
                            url: 'https://goodvid.io/install'
                        }, {
                            url: 'https://goodvid.io/about'
                        }, {
                            url: 'http://www.google.com'
                        }])
                        .expect(400, function (err, res) {

                            expect(res.body.error).to.exist;
                            expect(res.body.error.host).to.equal('www.google.com');
                            done(err);
                        });
                });

            it('will not return a validation error if all requests are to allowed', function (done) {

                request(appAllowed)
                    .post('/batch')
                    .send([{
                        url: 'https://goodvid.io/about'
                    }, {
                        url: 'https://goodvid.io/install'
                    }, {
                        url: 'https://goodvid.io/video-gallery'
                    }])
                    .expect(200, function (err, res) {

                        expect(res.body.error).to.not.exist;
                        done(err);
                    });
            });

            it('will accept localhost as an allowedHost and obey it', function (done) {

                request(appAllowed)
                    .post('/batch')
                    .send([{
                        url: 'https://goodvid.io/install'
                    }, {
                        url: 'https://goodvid.io/about'
                    }, {
                        url: 'https://goodvid.io/video-gallery'
                    }, {
                        url: 'http://localhost:3001/users/test/name'
                    }])
                    .expect(200, function (err, res) {

                        expect(res.body.error).to.not.exist;
                        done(err);
                    });
            });
        });
    });

    describe('other validation', function () {

        it('rejects request with bogus method', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    method: chance.word() + chance.word(),
                    url: 'http://localhost:4000/users/1/name'
                }])
                .expect(400, function (err, res) {

                    expect(err).to.be.null;
                    expect(res.body.error).to.exist;
                    expect(res.body.error.type).to.equal('ValidationError');
                    done();
                });
        });

        it('rejects request with bogus url', function (done) {

            request(app)
                .post('/batch')
                .send([{
                    url: chance.word()
                }])
                .expect(400, function (err, res) {

                    expect(err).to.be.null;
                    expect(res.body.error).to.exist;
                    expect(res.body.error.type).to.equal('ValidationError');
                    expect(res.body.error.message).to.equal('Invalid URL');
                    expect(res.body.error.request).to.equal(0);
                    done();
                });
        });

        it('rejects get requests with request bodies', function (done) {

            request(app)
                .get('/batch')
                .send([{
                    method: 'get',
                    url: 'http://localhost:4000/users/1/name',
                    body: '{"foo":"bar"}'
                }])
                .expect(400, function (err, res) {

                    expect(err).to.be.null;
                    expect(res.body.error).to.exist;
                    expect(res.body.error.type).to.equal('ValidationError');
                    expect(res.body.error.message).to.equal('Request body not allowed for this method');
                    expect(res.body.error.request).to.equal(0);
                    done();
                });
        });
    });
});
