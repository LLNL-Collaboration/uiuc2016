// client for opening a websocket connection to c++ relay server
function Client(name)
{
    this._name = name;

    this._viewer = {};
    this._view_initialized = false;
    this._new_data = {};

    this._port = -1;
    this._connection = {};
}

// start a connection with the c++ relay server
Client.prototype.run = function() 
{
    if(this._port < 0) {
        throw new Error("Port is not set yet.");
        return;
    }
    this._websocket();
}

Client.prototype.setPort = function(port) 
{
    this._port = port;
}

// the websocket that receives data from c++ relay server
Client.prototype._websocket = function()
{
    var self = this;

    this._connection = new WebSocket("ws://localhost:"+this._port+"/websocket");
    this._connection.onopen = function (event) {
        $("#status_display").html("<font color=green>[status=success]socket connection </font>");
    }
    this._connection.onmessage = function (msg) 
    {
        // var data;
        try
        {
            self._new_data=JSON.parse(msg.data);
            $("#status_display").html("<font color=green>[status=success]</font>");
            console.log(self._new_data);
            //if this is an update
            if ("normal_update" in self._new_data) {
                if(!self._view_initialized) {
                    $("#status_display").html("<font color=red>[status=error] update sent before view was initialized</font>");        
                }
                self._viewer.updateDataNormal(self._new_data);
            } else if("compressed_update" in self._new_data){
                //compressed updates are no longer maintained
                if(!self._view_initialized) {
                    $("#status_display").html("<font color=red>[status=error] update sent before view was initialized</font>");        
                }
                console.log("[status=error] compressed_update not supported");
                // viewer.updateDataCompressed(new_data);
            } else { // if this is not an update
                self._viewer = new MeshViewer("meshdiv");
                self._viewer.loadData(self._new_data);
                self._view_initialized = true;
            }
            window.onresize = function() { self._viewer.updateViewBox(); }

        }
        catch(e)
        {
            //caught an error in the above code, simply display to the status element
            $("#status_display").html("<font color=red>[status=error] " + e + "</font>");
            //log this error for debuging purpose
            console.log(e);
        }
    }
      
    this._connection.onerror = function (error)
    {
        console.log('WebSocket error');
        console.log(error)
        self._connection.close();
        $("#status_display").html("<font color=red>[status=error]</font>");
    }
    
    this._connection.onclose = function (error)
    {
        console.log('WebSocket closed');
        console.log(error)
        self._connection.close();
        $("#status_display").html("<font color=orange>[status=disconnected]</font>");
    }
}