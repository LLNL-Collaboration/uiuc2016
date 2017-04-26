## TO BUILD THIS SERVER UNDER CONDUIT:
1. Copy the file __*t_relay_blueprint_websocket.cpp*__ to __*conduit/src/tests/relay/*__
2. open __*conduit/src/tests/relay/CMakeLists.txt*__

	change line 52:

	```
      set(RELAY_TESTS t_relay_smoke
                      t_relay_io_basic
                      t_relay_node_viewer
                      t_relay_websocket)
	```
    to:
  	```
      set(RELAY_TESTS t_relay_smoke
                      t_relay_io_basic
                      t_relay_node_viewer
                      t_relay_websocket
                      t_relay_blueprint_websocket)
  	```

3. open __*conduit/src/libs/relay/CMakeLists.txt*__

   change line 148:

		target_link_libraries(conduit_relay PUBLIC conduit)
   to:
   
		target_link_libraries(conduit_relay PUBLIC conduit conduit_blueprint)

4. navigate to __*conduit/build-debug*__, run `make -j 8` to rebuild the files
5. the server executable will be available at __*conduit/build-debug/tests/relay/t_relay_blueprint_websocket*__

<br />
  
## HOW TO RUN THIS SERVER?

##### Under Docker:

1. run docker container: 
	```
	docker run -p 8081:8081 -t -i conduit-ubuntu:current
	```

2. under docker container, make sure you build the server executable by following steps mentioned above

3. run the server:

	* Option A: send default braid 2D example to client, by running 
	
	```
	./t_relay_blueprint_websocket launch default_data --port 8081 --address 0.0.0.0 
	```
	
	* Option B: send hdf5 or json files to client, by running 
	
	```
	./t_relay_blueprint_websocket launch --port 8081 --address 0.0.0.0 --datapath <path_to_the_file> 
	```

4. open __*client_meshviewer/index.html*__ with local machine browser, you should see mesh rendered by the data sent from the server.


##### Under local machine:

1. make sure you build the server executable by following steps mentioned above


2. run the server 

	* Option A: send default braid 2D example to client, by running
	
	```
	./t_relay_blueprint_websocket launch default_data --port 8081
	```
	
	* Option B: send hdf5 or json files to client, by running 
	
	```
	./t_relay_blueprint_websocket launch --port 8081 --datapath <path_to_the_file>
	```
	
3. open __*client_meshviewer/index.html*__ with local machine browser, you should see mesh rendered by the data sent from the server.

##### Additional options for server:

	--sleep_between_updates <sleep time between updates (default = 1000)>
