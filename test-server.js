'use strict';

var restify = require('restify');
var Logger = require('bunyan');

var log = new Logger({
  name: 'camunda-bpmn',
  streams: [
    {
      stream: process.stdout,
      level: 'debug'
    },
    {
      path: 'bpmn.log',
      level: 'trace'
    }
  ],
  serializers: {
    req: Logger.stdSerializers.req,
    res: restify.bunyan.serializers.res,
  },
});

var server = restify.createServer({
  name: 'camunda-bpmn',
  log: log   // Pass our logger to restify.
});

server.pre(function (request, response, next) {
  request.log.info({req: request}, 'start');        // (1)
  return next();
});

server.get({path: '/hello', name: 'SayHello'}, function(req, res, next) {
  req.log.debug(req.query());
  var caller = req.params.name || 'caller';
  req.log.debug('caller is "%s"', caller);
  res.send({'hello': caller});
  return next();
});

server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url);
});
