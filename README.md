camunda-bpmn.js : Super-charged for Node.js
==========

camunda BPMN Javascript libraries for parsing, executing and rendering BPMN 2.0 with Java Script. 

* Web Site: http://www.camunda.org/
* Issue Tracker: https://app.camunda.com/jira/secure/RapidBoard.jspa?rapidView=23&view=planning
* Contribution Guildelines: http://www.camunda.org/app/community-contribute.html
* License: Apache License, Version 2.0  http://www.apache.org/licenses/LICENSE-2.0

Node Server
---------
This fork is to implement a node bpmn server, using REST and Socket.IO.
**REST**
* *Create A Process* - this will create a new process. Post a process object to the processes collection
```
POST /processes/
```
* *Get a process* - returns the process object
```
GET /processes/{process-id}/
```
* *Search all processes* - get all or specific processes. Use process model attributes in your query string.
```
GET /processes
example GET /processes?processId=74886dba-97c8-11e2-bd89-0baa2afabdfe
```

see ~/models for the models in JSON schema (and samples)

**Socket.IO**

```
send a "sub-process" message and send a process object (min processId)

send a "attach-listener" message to listent on actions in the process

recieve "process-action" message when an action occurs in the process

send a "sub-new-process" message to begin listening on all new events (filter object?)

recieve a "new-process" message when a new process is created
```


Components
---------
 * *Transformer* - Supports parsing a BPMN 2.0 Xml File and transforming it into a Java Script object model. The same object model can then be passed to the Executor and the Renderer.
 * *Engine* - Lightweight Process Engine completely written in Java Script.
 * *Renderer* - Allows rendering BPMN 2.0 Diagrams using SVG or HTML5 Canvas.

Getting Started
---------
The entry point to the API is the Bpmn Class.

#### Bootstrapping the Renderer
The Renderer uses [dojo gfx](http://dojotoolkit.org/reference-guide/1.8/dojox) for abstracting SVG and HTML5 Canvas as underlying graphics technology.

You must first include the dojo bootstrap library:
```html
<script src="lib/dojo/dojo/dojo.js"
  data-dojo-config="async: true, parseOnLoad: true, forceGfxRenderer: 'svg'">
</script>
```

Now you can asynchronously load all required libraries. Assuming that the dojo distribution is located under `lib` and camunda-bpmn.js is located under `src/`:
```javascript
require({
  baseUrl: "./",
  packages: [
    { name: "dojo", location: "lib/dojo/dojo" },
    { name: "dojox", location: "lib/dojo/dojox"},
    { name: "bpmn", location: "src/bpmn"}]
});
```

And finally load & render the process diagram
```javascript
require(["bpmn/Bpmn", "dojo/domReady!"], function(Bpmn) {
  new Bpmn().renderUrl("test/resources/task_loop.bpmn", {
    diagramElement : "diagram",
    overlayHtml : '<div style="position: relative; top:100%"></div>'
  }).then(function (bpmn){
    bpmn.zoom(0.8);
    bpmn.annotate("reviewInvoice", '<span class="bluebox"  style="position: relative; top:100%">New Text</span>', ["highlight"]);
  });
});
```
Development
===========

We are using gruntjs:

```
grunt server watch  # start a web server at localhost:9000
grunt requirejs # optimzises and minifies the engine into 'optimized' folder
```

Open [localhost:9000/test/runner.html](http://localhost:9000/test/runner.html) too execute the jasmine tests in your browser while running the grunt server.
