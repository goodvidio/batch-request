'use strict';

var _ = require('lodash');
var check = require('validator').check;
var methods = require('methods');
var Promise = require('bluebird');
var request = require('request');
var url = require('url');

function makeRequest (r) {

    return new Promise(function (resolve) {

        request(r, function (err, resp) {

            /**
             * @todo: Decide what happens on connection errors
             */
            resolve(resp);
        });

    });
}

function getFinalUrl (req, r) {

    /**
     * Accept either uri or url (this is what request does, we just mirror)
     * @type {String}
     */
    r.url = r.url || r.uri;

    /* Convert relative paths to full paths */
    if (typeof r.url === 'string' && /^\//.test(r.url) === true) {
        return req.protocol + '://' + req.get('host') + r.url;
    }

    return r.url;
}

var batchRequest = function (p) {

    var defaults = {
        localOnly: true,
        httpsAlways: false,
        max: 20,
        validateRespond: true,
        allowedHosts: null,
        defaultHeaders: {},
        forwardHeaders: []
    };

    /* Set Default Options */
    var params = _.defaults(p || {}, defaults);

    var batch = function (req, res) {

        /**
         * Here we assume it the request has already been validated, either by
         * our included middleware or otherwise by the app developer.
         *
         * We also assume it has been run through some middleware like
         * express.bodyParser() or express.json() to parse the requests
         *
         */

        var requests = req.body;

        /* First, let's fire off all calls without any dependencies, accumulate their promises */
        var requestPromises = _.reduce(requests, function (promises, r, key) {

            if (!r.dependency || r.dependency === 'none') {
                r.headers = r.headers || {};

                r.url = getFinalUrl(req, r);

                _.each(params.defaultHeaders, function (headerV, headerK) {

                    /* copy defaults if not already exposed */
                    if (!(headerK in r.headers)) {
                        r.headers[headerK] = headerV;
                    }
                });
                _.each(params.forwardHeaders, function (headerK) {

                    /* copy forward if not already exposed */
                    if (!(headerK in r.headers) && headerK in req.headers) {
                        var forwardValue = req.headers[headerK];
                        r.headers[headerK] = forwardValue;
                    }
                });
                promises[key] = makeRequest(r)
                    .then(function (response) {

                        return {
                            'statusCode': response.statusCode,
                            'body': response.body,
                            'headers': response.headers
                        };
                    });
            }
            /**
             * And while we do that, build the dependency object with those items as keys
             * { key: Promise }
             */
            return promises;
        }, {});

        /* Then recursively iterate over all items with dependencies, resolving some at each pass */
        var recurseDependencies = function (reqs) {

            /**
             * End state hit when the number of promises we have matches the number
             * of request objects we started with.
             */
            if (_.size(requestPromises) >= _.size(reqs)) {
                return;
            } else {
                _.each(requestPromises, function (rp, key) {

                    var dependentKey = null;
                    var dependent = _.find(reqs, function (request, dKey) {

                        dependentKey = dKey;
                        return request.dependency === key &&
                            (typeof requestPromises[dKey] === 'undefined');
                    });
                    if (dependent) {
                        requestPromises[dependentKey] = rp.then(function () {

                            return makeRequest(dependent);
                        })
                            .then(function (response) {

                                return response;
                            });
                    }
                });
                recurseDependencies(reqs);
            }
        };

        /* Recurse dependencies */
        recurseDependencies(requests);

        /* Wait for all to complete before responding */
        Promise.props(requestPromises).then(function (result) {

            /* remove all properties, except status, body, and headers */
            var output = {};
            for (var prop in result) {

                output[prop] = {
                    statusCode: result[prop].statusCode,
                    body: result[prop].body,
                    headers: result[prop].headers
                };
            }
            res.json(output);
            /* next(); // this line is causing the response to be 0 */
        });
    };

    batch.validate = function (req, res, next) {

        var err = null;
        var requests = req.body;
        var requestHost;

        /* Validation on Request object as a whole */
        try {

            check(
                _.size(requests),
                'Cannot make a batch request with an empty request object'
            ).min(1);
            check(
                _.size(requests),
                'Over the max request limit. Please limit batches to ' + params.max + ' requests'
            ).max(params.max);
            if (req.method === 'POST' && !req.is('json')) {
                throw new Error('Batch Request will only accept body as json');
            }
        } catch (e) {

            err = {
                error: {
                    'message': e.message,
                    'type': 'ValidationError'
                }
            };
        }

        /* Validation on each request object */
        _.each(requests, function (r, key) {

            if (!r) {
                r = {};
            }

            /* If no method provided, default to GET */
            r.method = (typeof r.method === 'string') ? r.method.toLowerCase() : 'get';

            r.url = getFinalUrl(req, r);

            try {

                check(r.url, 'Invalid URL').isUrl();
                check(r.method, 'Invalid method').isIn(methods);
                if (r.body !== undefined) {
                    check(
                        r.method.toLowerCase(),
                        'Request body not allowed for this method'
                    ).isIn(['put', 'post', 'options']);
                }
            } catch (e) {

                err = {
                    error: {
                        'message': e.message,
                        'request': key,
                        'type': 'ValidationError'
                    }
                };
            }

            if (params.allowedHosts !== null) {
                requestHost = url.parse(r.url).host;
                if (params.allowedHosts.indexOf(requestHost) === -1) {
                    err = {
                        error: {
                            'message': 'Cannot make batch request to a host which is not allowed',
                            'host': requestHost,
                            'type': 'ValidationError'
                        }
                    };
                }
            }
        });

        if (err !== null) {
            res.status(400).send(err);
            next(err);
        } else {
            next();
        }
    };

    return batch;
};

module.exports = batchRequest;
