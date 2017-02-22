function websocket()
{
    // var wsproto = (location.protocol === 'https:') ? 'wss:' : 'ws:';
    // connection = new WebSocket(wsproto + '//' + window.location.host + '/websocket');
    var connection = new WebSocket("ws://localhost:8080");
    connection.onopen = function (event) {
        $("#status_display").html("<font color=green>[status=success]socket connection</font>");
        connection.send("testmesh.json");
    }
    connection.onmessage = function (msg) 
    {
        // var data;
        try
        {
            var data=JSON.parse(msg.data);
            $("#status_display").html("<font color=green>[status=success]</font>");
            
            // console.log(data);
            var viewer = new MeshViewer("meshdiv");
            viewer.loadData("rz", data);
            window.onresize = function() { viewer.updateViewBox(); }
        }
        catch(e)
        {
             //caught an error in the above code, simply display to the status element
            $("#status_display").html("<font color=red>[status=error] " + e + "</font>");
        }
    }
      
    connection.onerror = function (error)
    {
        console.log('WebSocket error');
        console.log(error)
        connection.close();
        $("#status_display").html("<font color=red>[status=error]</font>");
    }
    
    connection.onclose = function (error)
    {
        console.log('WebSocket closed');
        console.log(error)
        connection.close();
        $("#status_display").html("<font color=orange>[status=disconnected]</font>");
    }
}