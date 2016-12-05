import json

with open("testmesh.json") as file:
	data = json.load(file)

#Build Blueprint JSON object
blueprint_dict = {}
#Build coordsets
blueprint_dict["coordsets"] = {}
blueprint_dict["coordsets"]["coords"] = {}
blueprint_dict["coordsets"]["coords"]["type"] = "explicit"
blueprint_dict["coordsets"]["coords"]["system"] = "rz"
blueprint_dict["coordsets"]["coords"]["path"] = "coordsets/coords"
blueprint_dict["coordsets"]["coords"]["values"] = {"r":[], "z":[]}

#Build topologies
blueprint_dict["topologies"] = {}
blueprint_dict["topologies"]["mesh"] = {}
blueprint_dict["topologies"]["mesh"]["type"] = "unstructured"
blueprint_dict["topologies"]["mesh"]["coordset"] = "coords"
blueprint_dict["topologies"]["mesh"]["path"] = "topologies/mesh"
blueprint_dict["topologies"]["mesh"]["elements"] = {}
blueprint_dict["topologies"]["mesh"]["elements"]["shape"] = "quad"
blueprint_dict["topologies"]["mesh"]["elements"]["connectivity"] = []

#Collect r and z from testmesh.json
r = []
z = []
ordered_data = {}
dummy_value = {"pos":{"r":-1, "z":-1}}
#Convert key from string to integer

prev_key = -1
for key, value in data["coord"].items():
	if (int(key) - prev_key) > 1:
		for i in range(prev_key+1, int(key)):
			ordered_data[i] = dummy_value
	elif (int(key) - prev_key) < 1:
		print 'Incorrect node index'
	ordered_data[int(key)] = value 

#Loop through ordered data

for key, value in ordered_data.items():
	r.append(value["pos"]["r"])
	z.append(value["pos"]["z"])

blueprint_dict["coordsets"]["coords"]["values"]["r"] = r
blueprint_dict["coordsets"]["coords"]["values"]["z"] = z

#Collect connectivities
c = []
for key, value in data["zones"].items():
	c.extend(value["nids"])

blueprint_dict["topologies"]["mesh"]["elements"]["connectivity"] = c 

with open("blueprint_mesh.json","wt") as out:
	json.dump(blueprint_dict, out, indent=4)