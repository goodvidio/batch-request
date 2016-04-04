Batch Request
=============

A simple library for batching HTTP requests. This is a fork from [batch-request](http://batch-request.socialradar.com). We have updated the
library and made a few modifications.

With the batch-request module, you would pass requests like this:
```
{
    request1: {
        url: 'http://google.com',
        method: 'GET',
        dependent: 'request2'
    },
    request2: {
        url: 'http://oneurl.com',
        method: 'POST',
        body: {
            field: "value"
        }
    }
}
```
while in this fork you would pass it like this:
```
[
    {
        url: 'http://google.com',
        method: 'GET'
    },
    {
        url: 'http://oneurl.com',
        method: 'POST',
        body: {
            field: "value"
        }
    }
]
```
which means simpler declaration of the requests but abandon of the
requests dependencies.

## Documentation
Soon to come. For the moment, check [batch-request](http://batch-request.socialradar.com/#usage).

## Todo

- [ ] Rename module
- [ ] Publish to NPM
- [ ] Write Documentation
- [ ] Add Travis build job
