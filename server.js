var ws = require("nodejs-websocket")
var Hapi = require('hapi');
var apiServer = new Hapi.Server();
var clientList = [];

function startWebSocket(port) {
  var wsserver = ws.createServer(function(conn) {
    conn.on("text", function(str) {
      if (str != "ping")
      {
        console.log('Client registered ' + str);
        clientList.push(conn);
      }
    });
    conn.on("close", function(code, reason) {
      var connId = -1;
      for (var i = 0; i < clientList.length; ++i)
      {
        if (clientList[i] == conn)
        {
          console.log("Disconnected", i);
          connId = i;
          break;
        }
      }
      if (connId != -1)
        clientList.splice(connId, 1);
        console.log("Connection closed")
    });
    conn.on("error", function(err) {
      console.log("An error occured in WebSocket server:", err);
    });
  }).listen(port, "127.0.0.1", function() { console.log('WS server running on port: ' + port) });
}

function startAPI(settings) {

  apiServer.connection({
    host: settings.httpHost,
    port: settings.httpPort
  });

  apiServer.route({
    method: 'GET',
    path: '/hello',
      handler: function (request, reply) {
        reply('Hello!');
    }
  });

  apiServer.route({
    method: 'POST',
    path: settings.apiPath,
    handler: function(request, reply) {
      var dId = request.headers.deviceauthuuid ? request.headers.deviceauthuuid : 'unknown';
      console.log('Received POST data: device ' + dId);
      if (clientList.length > 0) {
        var response = {};
        response.deviceId = dId;
        response.data = request.payload;
        for (var i = 0; i < clientList.length; ++i)
        {
          console.log("Sending to ", i);
          clientList[i].sendText(JSON.stringify(response));
        }
      }
      reply();
    }

  });
  apiServer.start(function() {
    console.log('APIServer running at:', apiServer.info.uri);
  });

}

startWebSocket( "8101" );
startAPI( {
  apiPath : "/api",
  httpPort : "8100",
  httpHost : "0.0.0.0"
} );