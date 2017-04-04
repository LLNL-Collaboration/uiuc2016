import json
import sys, getopt

def convert(inputfile, outputfile):
	with open(inputfile) as file:
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

	#Build fields
	blueprint_dict["fields"] = {}
	blueprint_dict["fields"]["braid"] = {}
	blueprint_dict["fields"]["braid"]["topology"] = "mesh"
	blueprint_dict["fields"]["braid"]["association"] = "vertex"
	blueprint_dict["fields"]["braid"]["type"] = "scalar"
	blueprint_dict["fields"]["braid"]["values"] = []
	#Collect r and z from testmesh.json
	r = []
	z = []
	ordered_data = {}

	prev_key = -1
	for key, value in data["coord"].items():

		ordered_data[int(key)] = value

	#Loop through ordered data
	coord_map = {}
	map_value = 0;
	for key, value in ordered_data.items():
		key = int(key)
		# if (key - prev_key) > 1:
				# num_to_fill = key - prev_key - 1
				# r.extend([-1]*num_to_fill)
				# z.extend([-1]*num_to_fill)
				# map_value =  map_value + num_to_fill
		coord_map[key] = map_value
		map_value = map_value + 1
		# elif (key - prev_key) < 1:
		# 	print 'Incorrect node index'	
		r.append(value["pos"]["r"])
		z.append(value["pos"]["z"])
		# prev_key = key



	
	blueprint_dict["coordsets"]["coords"]["values"]["z"] = z
	blueprint_dict["coordsets"]["coords"]["values"]["r"] = r

	#Collect connectivities
	c = []
	ordered_zones = {}
	for key, value in data["zones"].items():
		ordered_zones[int(key)] = value
        
	for key, value in ordered_zones.items():
		c.extend(value["nids"])

	mapped_c = []
	for elem in c:
		# print(elem)
		mapped_c.append(coord_map[elem])

	blueprint_dict["topologies"]["mesh"]["elements"]["connectivity"] = mapped_c 

	#Collect fields value
	v = range(len(ordered_zones))
	blueprint_dict["fields"]["braid"]["values"] = [float(elem) for elem in v]

	with open(outputfile,"wt") as out:
		json.dump(blueprint_dict, out, indent=4)



def main(argv):
   inputfile = ''
   outputfile = ''
   try:
      opts, args = getopt.getopt(argv,"hi:o:",["ifile=","ofile="])
   except getopt.GetoptError:
      print 'test.py -i <inputfile> -o <outputfile>'
      sys.exit(2)
   for opt, arg in opts:
      if opt == '-h':
         print 'test.py -i <inputfile> -o <outputfile>'
         sys.exit()
      elif opt in ("-i", "--ifile"):
         inputfile = arg
      elif opt in ("-o", "--ofile"):
         outputfile = arg
   print 'Input file is: ', inputfile
   print 'Output file is: ', outputfile
   convert(inputfile, outputfile)


if __name__ == "__main__":
   main(sys.argv[1:])
