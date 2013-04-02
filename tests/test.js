var assert = require("chai").assert
  , expect = require("chai").expect
  , util = require("util")
  , io = require("socket.io-client")
  , restify = require('restify');

var HOST = "http://0.0.0.0:8080";

var processObject = {
  "id" : null,
  "description" : "Number Guessing",
  "active" : true,
  "name" : "number-guess",
  "bpmnSourceURI" : "https://raw.github.com/zipsquibly/camunda-bpmn.js/master/test/resources/number-guess.bpmn",
  "startDateTime" : "2012-11-05T08:15:30-05:00",
  "endDateTime" : "2012-11-05T08:15:30-05:00",
  "lastActionDateTime" : "2012-11-05T08:15:30-05:00",
  "context" : {
     "personId" : "5ac0eda6-97bb-11e2-a595-ef9861d0ea07",
     "patientId" : "1ac0eda6-97bb-11e2-a595-ef9861d0ea07",
     "visitId" : "2ac0eda6-97bb-11e2-a595-ef9861d0ea07",
     "userId" : "3ac0eda6-97bb-11e2-a595-ef9861d0ea07",
     "documentId" : "4ac0eda6-97bb-11e2-a595-ef9861d0ea07"
  },
  "currentState" : {},
  "history" : []
};

var client = restify.createJsonClient({
  url: HOST
});

var socket = io.connect(HOST);
var newProcessEvents = [];
var allProcessEvents = [];
socket.on("connect", function () {
  socket.emit("subscribe-new-process-events", {});
  socket.on("new-process-event", function (processObject) {
    newProcessEvents.push(processObject);
    socket.on("process-event", function (processEvent) {
        allProcessEvents.push(processEvent);
      });
    socket.emit("subscribe-process-events", {
        processId: processObject.id,
        activityDefinitionId: "end",
        eventType: "end" 
      });
    socket.emit("subscribe-process-events", {
        processId: processObject.id,
        eventType: "start" 
      });
  });
});


describe('Manage a process', function(){
  describe('Create a process', function(){
    var newId = null;
    it('should create a valid process when I post', function(done){
      client.post("/processes", processObject, function(err, req, res, obj) {
        if (err) throw(err);
        expect(res.statusCode).to.equal(200);
        expect(obj.id).to.not.equal(null);
        newId = obj.id;
        done();
      });
    });
    it('should find the process I just created', function(done){
      client.get("/processes/" + newId, function(err, req, res, obj) {
        if (err) throw(err);
        expect(res.statusCode).to.equal(200);
        expect(obj.id).to.equal(newId);
        done();
      });
    });
    it('should get a socket event for a new process', function(){
      expect(newProcessEvents.length).to.equal(1);
      var se = newProcessEvents.pop();
      expect(newId).to.equal(se.id);     
    });
    it('should get some process events when the process is started', function (done) {
      var signal = { "activityDefinitionId" : "start" };
      client.post("/processes/" + newId + "/signal", signal, function(err, req, res, obj) {
        if (err) throw(err);
        expect(res.statusCode).to.equal(200);
        assert(allProcessEvents.length > 0, "Did not receive process events");
        done();
      });
    });
    it('should send the process its secret number', function (done) {
      var signal = { "activityDefinitionId" : "generateNumber", "data" : { "secret" : Math.floor(Math.random() * 20) + 1} };
      client.post("/processes/" + newId + "/signal", signal, function(err, req, res, obj) {
        if (err) throw(err);
        expect(res.statusCode).to.equal(200);
        done();
      });
    });
    it('should end if we keep signaling it to guess numbers', function (done) {
      var sigIt = function () {
        var signal = { "activityDefinitionId" : "guessNumber", "data" : { "guess" : Math.floor(Math.random() * 20) + 1} };
        client.post("/processes/" + newId + "/signal", signal, function(err, req, res, obj) {
          if (err) throw(err);
          expect(res.statusCode).to.equal(200);
        });
      };
      socket.on("process-event", function (processEvent) {
        if (processEvent.activityDefinitionId == "guessNumber") {
          sigIt();
        } else if (processEvent.eventType == "end" && processEvent.activityDefinitionId == "end") {
          done();
        }
      }); 
      sigIt();
    });
  });
});
