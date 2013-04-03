var store = {}
  , listeners = {}
  , processEventListeners = {}
  , uuid = require('uuid')
;

exports.addProcess = function (processObject) {
  store[processObject.id] = processObject;
  processEventListeners[processObject.id] = {};
  process.nextTick(function () {
    for (id in listeners) {
      listeners[id].apply(exports, [processObject]);
    }
  });
};

exports.getProcess = function(id) {
  return store[id];
};

exports.addNewProcessListener = function(cb) {
  var id = uuid.v4();
  listeners[id] = cb;
  return id;
};

exports.removeNewProcessListener = function(id) {
  delete listeners[id];
};

exports.addProcessEventListener = function(processId, cb) {
  console.log("adding process event listener: " + processId);
  var id = uuid.v4();
  processEventListeners[processId][id] = cb;
  return id;
};

exports.removeProcessEventListener = function(processId, id) {
  delete processEventListeners[processId][id];
};

exports.raiseProcessEvent = function(processId, eventType, event) {
  for (id in processEventListeners[processId]) {
    processEventListeners[processId][id](eventType, event);
  }
};
