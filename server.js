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
  socket.on('sub-new-processes', function (data) {
    var listenerId = processStore.addNewProcessListener(function (processObject) {
      socket.emit('new-process', processObject);
    });
    socket.on('disconnect', function () {
      processStore.removeNewProcessListener(listenerId);
    });
  });
  socket.on('sub-process', function (data) {
    var processObject = processStore.get(data.processId);
  });
  socket.on('attach-listener', function (data) {

  });
  socket.on('disconnect', function () {

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
    var ps = {};
    ps.addProcess = function (processObject) {
      store[processObject.id] = processObject;
      process.nextTick(function () {
        for (id in listeners) {
          listeners[id].apply(ps, [processObject]);
        }
      });
    };
    ps.getProcess = function(id) {
      return store[id];
    };
    ps.addNewProcessListener = function(cb) {
      var id = uuid.v4();
      listeners[id] = cb;
      return id;
    };
    ps.removeNewProcessListener = function(id) {
      delete listeners[id];
    };
    return ps;
  }
)();

function createProcess(processXml, processObject, cb) {
    var instance = Engine.startInstance(processXml, { }, [
      {
         id : "generateNumber",
         "start" : function (execution) {
              execution.parentExecution.variables.secret = Math.floor(Math.random() * 5) + 1;
              console.log("Secret is " + execution.parentExecution.variables.secret);
         }
      },
      {
         id : "guessNumber",
         "take" : function (execution) {
              execution.parentExecution.variables.guess = Math.floor(Math.random() * 5) + 1;
              console.log("Guess is " + execution.parentExecution.variables.guess);
         }
      },
      {
         id : "end",
         "end" : function (execution) {
           console.log("COMPLETE");
           win = true;
         }
      }
    ]);
    var win = false;
    var inter = setInterval( function () { 
      instance.signal('guessNumber');
      //instance.continue();
      if (win) clearInterval(inter);
    }, 1);

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

