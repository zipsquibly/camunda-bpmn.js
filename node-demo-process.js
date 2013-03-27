var requirejs = require('requirejs');

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
CAM = null;
DOMParser = require('xmldom').DOMParser;
window = {
	DOMParser : DOMParser
};


requirejs(["bpmn/Engine"], function (Engine) {
var processXml = '<?xml version="1.0" encoding="UTF-8"?>' +
	              '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" '+
	              'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+

	              '<process id="theProcess" isExecutable="true">' +

	              '<startEvent id="theStart" />'+
	              '<userTask id="task" />'+
	              '<endEvent id="end" />'+

	              '<sequenceFlow id="flow1" sourceRef="theStart" targetRef="task" />'+
	              '<sequenceFlow id="flow2" sourceRef="task" targetRef="end" />'+

	              '</process>'+

	              '</definitions>';

var instance = Engine.startInstance(processXml, {}, [
      	{
	      id : "task",
	      "start" : function (execution) {
	         console.log(execution);
	      	 console.log("start " + execution.activityDefinition.id);
	      }
        },
      	{
      	 id : "end",
      	"end" : function (execution) {
      		console.log(execution);
      		console.log("after " + execution.activityDefinition.id);
      	}
      }]);
instance.signal("task");

});
