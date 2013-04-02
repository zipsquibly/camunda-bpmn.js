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
var socketEvents = [];
socket.on("connect", function () {
  socket.emit("sub-new-processes", {});
  socket.on("new-process", function (data) {
    // console.log("new-process: " + util.inspect(data));
    socketEvents.push(data);
  });
});


describe('Manage a process', function(){
  describe('Create a process', function(){
    var newId = null;
    it('should create a valid process when I post', function(done){
      client.post("/processes", processObject, function(err, req, res, obj) {
        if (err) {
          throw(err);
        }
        // console.log("Got response: " + res.statusCode);
        // console.log("Got response: " + util.inspect(obj));
        expect(res.statusCode).to.equal(200);
        expect(obj.id).to.not.equal(null);
        newId = obj.id;
        done();
      });
    });
    it('should find the process I just created', function(done){
      client.get("/processes/" + newId, function(err, req, res, obj) {
        if (err) {
          throw(err);
        }
        // console.log("Got response: " + res.statusCode);
        // console.log("Got response: " + util.inspect(obj));
        expect(res.statusCode).to.equal(200);
        expect(obj.id).to.equal(newId);
        done();
      });
    });
    it('should get a socket event for a new process', function(){
      expect(socketEvents.length).to.equal(1);
      var se = socketEvents.pop();
      expect(newId).to.equal(se.id);     
    });
  });
});
