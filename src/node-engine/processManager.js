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
    baseUrl: __dirname + '/../',
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

requirejs(["bpmn/Engine"], function (engineModule) {
  Engine = engineModule;
});

exports.createProcess = function(processXml, processObject, processStore, cb) {
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
      },
      {
         id : "generateNumber",
         "end" : function (execution) {
              console.log("Secret is " + execution.parentExecution.variables.secret);
         }
      },
      {
         id : "guessNumber",
         "end" : function (execution) {
              console.log("Guess is " + execution.parentExecution.variables.guess);
         }
      },
      {
         id : "end",
         "end" : function (execution) {
           console.log("COMPLETE");
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

