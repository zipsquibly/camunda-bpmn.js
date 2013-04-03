var restify = require('restify')
  , Logger = require('bunyan')
  , querystring = require('querystring')
  , util = require('util')
  , requirejs = require('requirejs')
  , http = require('http')
  , https = require('https')
  , uuid = require('uuid')
  , socketio = require('socket.io')
;

requirejs.config({
    //Use node's special variable __dirname to
    //get the directory containing this file.
    //Useful if building a library that will
    //be used in node but does not require the
    //use of node outside
    baseUrl: __dirname + '/src/',
    name: 'bpmn',
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require
});

// Creating GLOBALS to replace the window and DOMParser objects 
// you would get in a browser

CAM = null; // require of engine creates global CAM

DOMParser = require('xmldom').DOMParser;
window = {
  DOMParser : DOMParser
};
var Engine = null;

var log = new Logger({
  name: 'camunda-bpmn',
  level: process.env.LOG_LEVEL || 'info',
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

//// SERVER SET UP

var server = restify.createServer({
  name: 'camunda-bpmn',
  log: log   // Pass our logger to restify.
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.bodyParser({ mapParams: false }));
server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true, // throttle based on source ip address
  overrides: {
    '127.0.0.1': {
      rate: 0, // unlimited
      burst: 0
    }
  }
}));
server.on('after', restify.auditLogger({ log: log }));

server.pre(function (request, response, next) {
  request.log.info({req: request}, 'start');        // (1)
  return next();
});

//// Socket.IO SETUP ///////
var io = socketio.listen(server);
io.sockets.on('connection', function (socket) {
  socket.on('subscribe-new-process-events', function (data) {
    var listenerId = processStore.addNewProcessListener(function (processObject) {
      socket.emit('new-process-event', processObject);
    });
    socket.on('disconnect', function () {
      processStore.removeNewProcessListener(listenerId);
    });
  });
  socket.on('subscribe-process-events', function (subData) {
    var listenerId = processStore.addProcessEventListener(subData.processId, function (eventType, event) {
      // if (event.activityDefinition.sequenceFlows) console.log(util.inspect(event.activityDefinition.sequenceFlows[0], { depth : 8 }));
      // console.log(util.inspect(event, { depth : 4 }));
      var data = {
        eventType : eventType,
        activityType: event.activityDefinition.type,
        activityName: event.activityDefinition.name,
        activityDefinitionId : event.activityDefinition.id,
        incomingSequenceFlowId : event.incomingSequenceFlowId,
        startDateTime: event.startDate,
        endDateTime: event.endDate
      };
      if (subData.eventType === undefined || subData.eventType == "all" || subData.eventType == eventType) {
        if (subData.activityDefinitionId === undefined || subData.activityDefinitionId == "all" || 
          subData.activityDefinitionId == event.activityDefinition.id) {
            socket.emit('process-event', data);
        }
      }
    });
    socket.on('disconnect', function () {
      processStore.removeProcessEventListener(subData.processId, listenerId);
    });
  });
});


//// REST API DECL

server.get({path: '/processes', name: 'searchProcesses'}, function(req, res, next) {
  var query = querystring.parse(req.query());
});

server.post({path: '/processes', name: 'createProcesses'}, function(req, res, next) {
  console.log("BODY: " + util.inspect(req.body));
  var processObject = req.body;
  var bpmnUrl = processObject.bpmnSourceURI;

  getURL(bpmnUrl, function (err, processXml) {
    console.log("got bpmn");
    processObject.bpmnXml = processXml;
    createProcess(processXml, processObject, function () {
      console.log("process created");
      res.send(processObject);  
      next();
    });
  });
});

server.get({path: '/processes/:processId', name: 'getProcessById'}, function(req, res, next) {
  console.log(util.inspect(req.params));
  var processObject = processStore.getProcess(req.params.processId);
  res.send(processObject);  
});

server.post({path: '/processes/:processId/signal', name: 'signalProcess'}, function(req, res, next) {
  var processObject = processStore.getProcess(req.params.processId);
  var signal = req.body;
  processObject.signal(signal.activityDefinitionId, signal.data);
  res.send(signal);  
});
server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url);
});

//// END REST API ///

requirejs(["bpmn/Engine"], function (engineModule) {
  Engine = engineModule;
});

var processStore = (function() {
    var store = {};
    var listeners = {}; 
    var processEventListeners = {}; 
    var ex = {};
    ex.addProcess = function (processObject) {
      store[processObject.id] = processObject;
      processEventListeners[processObject.id] = {};
      process.nextTick(function () {
        for (id in listeners) {
          listeners[id].apply(ex, [processObject]);
        }
      });
    };
    ex.getProcess = function(id) {
      return store[id];
    };
    ex.addNewProcessListener = function(cb) {
      var id = uuid.v4();
      listeners[id] = cb;
      return id;
    };
    ex.removeNewProcessListener = function(id) {
      delete listeners[id];
    };
    ex.addProcessEventListener = function(processId, cb) {
      console.log("adding process event listener: " + processId);
      var id = uuid.v4();
      processEventListeners[processId][id] = cb;
      return id;
    };
    ex.removeProcessEventListener = function(processId, id) {
      delete processEventListeners[processId][id];
    };
    ex.raiseProcessEvent = function(processId, eventType, event) {
      for (id in processEventListeners[processId]) {
        processEventListeners[processId][id](eventType, event);
      }
    };
    return ex;
  }
)();

function createProcess(processXml, processObject, cb) {
    var instance = Engine.startInstance(processXml, { }, [
      {
        "start" : function (execution) {
          processStore.raiseProcessEvent(processObject.id, "start", execution);
        },
        "take" : function (execution) {
          processStore.raiseProcessEvent(processObject.id, "take", execution);
        },
        "end" : function (execution) {
          processStore.raiseProcessEvent(processObject.id, "end", execution);
        }
      }
    ]);

    processObject.signal = function (activityDefinitionId, data) {
      if (data) {
        for (var property in data) {
          instance.variables[property] = data[property];
        }
      }
      instance.signal(activityDefinitionId);
    };

    processObject.id = uuid.v4();
    processStore.addProcess(processObject);
    console.log("calling callback")
    cb.call();
}


/// UTILITIES

function getURL (url, cb) {
  console.log("getting: " + url);
  var client = false;
  if (url.match(/^https:/)) {
    client = https;
  } else if (url.match(/^http:/)) {
    client = http;
  }
  if (client) {
    client.get(url, function(response) {
      console.log("Got response: " + response.statusCode);
      var body = '';
      response.on('data', function (chunk) {
        body += chunk;
      });
      response.on('end', function () {
        cb(null, body);
      });
    }).on('error', function(e) {
      cb(e, null)
    });
  } else {
      cb({"exception" : true, "message" : "must be http or https URL"}, null);
  }
}

