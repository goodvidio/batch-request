// header options tests

process.env.NODE_ENV = 'test';

var _ = require('lodash'),
    Chance = require('chance'),
    chance = new Chance(),
    expect = require('chai').expect,
    methods = require('methods'),
    request = require('supertest');

describe('header options', function() {
    var app;

    before(function(done) {
        app = require('./helpers/app')({
            defaultHeaders: {
                'default1': 'default1_value'
            },
            forwardHeaders: ['forward1']
        });
        done();
    });

    after(function(done) {
        app.server.close(done);
    });

    describe('defaultHeaders', function() {
        it('Header default1', function(done) {
            request(app)
                .post('/batch')
                .send([
                    {
                        url: 'http://localhost:3000/header/default1'
                    }
                ])
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body.length).to.equal(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    var obj = JSON.parse(res.body[0].body);
                    expect(obj.value).to.be.a('string');
                    expect(obj.value).to.be.equal('default1_value');
                    done();
                });
        });

        it('Header default2 does not exist if no default set', function(done) {
            request(app)
                .post('/batch')
                .send([
                    {
                        url: 'http://localhost:3000/header/default2'
                    }
                ])
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body.length).to.equal(1);
                    expect(res.body[0].statusCode).to.equal(404);
                    done();
                });
        });
    });

    describe('forwardHeaders', function() {
        it('Header forward1 exists', function(done) {
            request(app)
                .post('/batch')
                .set('forward1', 'forward1_value')
                .send([
                    {
                        url: 'http://localhost:3000/header/forward1'
                    }
                ])
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body.length).to.equal(1);
                    expect(res.body[0].statusCode).to.equal(200);
                    expect(res.body[0].body).to.be.a('string');
                    var obj = JSON.parse(res.body[0].body);
                    expect(obj.value).to.be.a('string');
                    expect(obj.value).to.be.equal('forward1_value');
                    done();
                });
        });

        it('Header forward1 does not exist if not provided', function(done) {
            request(app)
                .post('/batch')
                .send([
                    {
                        url: 'http://localhost:3000/header/forward1'
                    }
                ])
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body.length).to.equal(1);
                    expect(res.body[0].statusCode).to.equal(404);
                    done();
                });
        });
    });
});
