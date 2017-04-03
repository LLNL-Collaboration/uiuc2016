/*
    The C++ server is not configured to receive data from its client. 
*/
function websocket()
{
    var connection = new WebSocket("ws://localhost:8081/websocket");
    var new_data;
    var view_initialized = false;
    var viewer;
    connection.onopen = function (event) {
        $("#status_display").html("<font color=green>[status=success]socket connection</font>");
    }
    connection.onmessage = function (msg) 
    {
        // var data;
        try
        {
            new_data=JSON.parse(msg.data);
            $("#status_display").html("<font color=green>[status=success]</font>");
            console.log(new_data);
            //if this is an update
            if ("normal_update" in new_data) {
                if(!view_initialized) {
                    $("#status_display").html("<font color=green>[status=error] update sent before view was initialized</font>");        
                }
                viewer.updateDataNormal(new_data);
            } else if("compressed_update" in new_data){
                //compressed updates are no longer maintained
                if(!view_initialized) {
                    $("#status_display").html("<font color=green>[status=error] update sent before view was initialized</font>");        
                }
                console.log("[status=error] compressed_update not supported");
                // viewer.updateDataCompressed(new_data);
            } else { // if this is not an update
                viewer = new MeshViewer("meshdiv");
                viewer.loadData(new_data);
                view_initialized = true;
            }
            window.onresize = function() { viewer.updateViewBox(); }

        }
        catch(e)
        {
            //caught an error in the above code, simply display to the status element
            $("#status_display").html("<font color=red>[status=error] " + e + "</font>");
            //log this error for debuging purpose
            console.log(e);
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