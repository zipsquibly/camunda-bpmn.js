var restify = require('restify')
, Logger = require('bunyan')
, util = require('util')
, requirejs = require('requirejs')
, uuid = require('uuid')
;

requirejs.config({
  baseUrl: __dirname + '/../',
  name: 'bpmn',
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
  cb.call(processObject);
}

