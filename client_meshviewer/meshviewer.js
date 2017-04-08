/******************** basic viewer for 2D meshes ********************/

function MeshViewer(name)
{
    this._name = name;
    
    this._divElem = 0;
    this._svgElem = 0;
    this._meshElem = 0;
    this._zonesElem = 0;
    this._vertexElem = 0;

    this._dims = [];
    this._nodes = {};
    this._zones = {};
    this._fields = {};
    this._scale = {};
    this._vertices = {};
    this._radius = 0;

    this._views = {};
    this._viewBox = [];
    this._viewRes = 0;
    this._fieldTypes = [];
    this._fieldTypeActive = 0;
    this._fieldColor = {};
    this._fieldAssoc = {};
    
    this._setupZoom();
    this._setupToolTip();
    
    this._shrink = 0.9;
    this._invShrink = 1 - this._shrink;
}

/******************** public functions ********************/
//MeshViewer only supports unstructured mesh with xy or rz coordinates
MeshViewer.prototype.loadData = function(data)
{
    this._dims = Object.keys(data.coordsets.coords.values);
    //check the data to make sure coordinates are not inverted
    if(this._dims[0] == 'r') {
        this._dims[0] = 'z';
        this._dims[1] = 'r';
    } else if (this._dims[0] == 'y') {
        this._dims[0] = 'x'
        this._dims[1] = 'y'
    }

    //Load coordinate arrays
    this._nodes[this._dims[0]] = data.coordsets.coords.values[this._dims[0]];
    this._nodes[this._dims[1]] = data.coordsets.coords.values[this._dims[1]];
    console.log(this._nodes);
    //load connectivity array
    var topo = data.topologies.mesh.elements.connectivity;
    for (var i=0; i<topo.length/4; i++) {
        var mesh = topo.slice(i*4, (i+1)*4);
        this._zones[i] = {
            'nids': mesh
        };
    }

    for (var i = 0; i < this._nodes[this._dims[0]].length; i++) {
        var vertex = {};
        vertex[this._dims[0]] = this._nodes[this._dims[0]][i];
        vertex[this._dims[1]] = this._nodes[this._dims[1]][i];
        this._vertices[i] = vertex;
    }
    //load fields array
    this._fields = data.fields;

    //this should sort fields types in order: braid, radial, vel
    this._fieldTypes = Object.keys(this._fields).sort();

    //set the default view type
    this._fieldTypeActive = this._fieldTypes[1];

    //store which field types are associated with elements, or vertex
    this._fieldAssoc['element'] = [];
    this._fieldAssoc['vertex'] = [];
    for(var i = 0; i < this._fieldTypes.length; i++) {
        var fieldType = this._fieldTypes[i];
        this._fieldAssoc[this._fields[fieldType]["association"]].push(fieldType);
    }
    this._setupGUI();
    this._setupColorMap();
    this._computeColor();
    this._setupActiveViewMesh();
    this._computeView();
    this._setupView();
}

MeshViewer.prototype.updateDataNormal = function(new_data)
{
    //update zones using connectivity array
    var mesh;
    var topo = new_data["conn_value"];
    for(var i = 0; i < topo.length/4; i++) {
        mesh = topo.slice(i*4, (i+1)*4);
        this._zones[i]["nids"] = mesh;
    }

    //update rz positions using rz arrays
    var dims = this._dims;
    this._nodes[dims[0]] = new_data[dims[0]];
    this._nodes[dims[1]] = new_data[dims[1]];

    //update fields using field array
    this._fields = new_data.fields;

    this._removeMesh();
    this._setupColorMap();
    this._computeColor();
    this._setupActiveViewMesh();
    this._computeView();
    this._setupView();
}

MeshViewer.prototype.updateViewBox = function()
{
    var vbox = this._viewBox;

    var rect = [parseFloat(this._divElem.style('width')),
                parseFloat(this._divElem.style('height'))];
                
    if (this._viewRes == 0) {
        var rectAR = rect[0] / rect[1];
        var vboxAR = vbox[2] / vbox[3];
        
        if (rectAR < vboxAR) {
            vbox[3] = vbox[2] / rectAR;  // fix width update height
        }
        else if (rectAR > vboxAR) {
            vbox[2] = vbox[3] * rectAR;  // fix height update width
        }
        this._viewRes = vbox[2] / rect[0];
    }
    else {
        vbox[2] = rect[0] * this._viewRes;
        vbox[3] = rect[1] * this._viewRes;
    }
    this._svgElem.attr('viewBox', vbox.join(' '));
}

MeshViewer.prototype.getFieldTypes = function() 
{
    return this._fieldTypes;
}

MeshViewer.prototype.getActiveFieldType = function()
{
    return this._fieldTypeActive;
}

/******************** protected/private functions ********************/

// linear interpolation between centroid and node
MeshViewer.prototype._shrinkNode = function(mid, node)
{
    var dims = this._dims;
    return [this._shrink * node[0] + this._invShrink * mid[dims[0]],
            this._shrink * node[1] + this._invShrink * mid[dims[1]]];
}

// shrink zone geometry towards centroid
MeshViewer.prototype._shrinkZone = function(zone)
{
    var dims = this._dims;
    var nodes = this._nodes;
    var ids = zone.nids;

    // compute centroid of zone
    if (!('mid' in zone)) {
        var val0 = 0, val1 = 0;
        for (i = 0; i < ids.length; ++i) {
            val0 += nodes[dims[0]][ids[i]];
            val1 += nodes[dims[1]][ids[i]];
        }
        var mid = zone['mid'] = {};
        mid[dims[0]] = val0 / ids.length;
        mid[dims[1]] = val1 / ids.length;
    }
    var self = this;  // for anonymous functions

    var shrinkFunc = function(mid) {
        return function(id) { return self._shrinkNode(mid, [nodes[dims[0]][id], nodes[dims[1]][id]]); };
    }
    return ids.map(shrinkFunc(zone['mid']));
}

MeshViewer.prototype._createPath = function(id)
{
    // generate closed poly-line path
    var lineFunc = d3.svg.line()
        .x(function(p) { return p[0]; })
        .y(function(p) { return p[1]; })
        .interpolate('linear-closed');
        
    return lineFunc(this._shrinkZone(this._zones[id]));
}

MeshViewer.prototype._updateTransform = function()
{
    var trans = d3.event.translate;
    var transStr = 'translate(' + trans[0] + ',' + trans[1] + ')';

    // flip svg so that y=0 is at bottom: (scale,-scale)
    var scale = d3.event.scale;
    var scaleStr = 'scale(' + scale + ',-' + scale + ')';

    this._meshElem.attr('transform', transStr + scaleStr);
}

MeshViewer.prototype._setupColorMap = function ()
{
    for(var i = 0; i < this._fieldTypes.length; i++) {
        var fieldType = this._fieldTypes[i];
        if(fieldType === "vel") {
            //field type for vel is not supported
            continue;
        }
        var min_val = this._findMin(this._fields[fieldType]["values"]);
        var max_val = this._findMax(this._fields[fieldType]["values"]);
        var colormap = d3.scale.linear()
                    .domain([ min_val, (min_val+max_val)/2.0, max_val])
                    .range(["#FA8383","#9DD3CC","#FFE4B3"]);
        this._scale[fieldType] = colormap;
    }
}

MeshViewer.prototype._computeColor = function()
{
    for(var i = 0; i < this._fieldTypes.length; i++) {
        var fieldType = this._fieldTypes[i];
        if(fieldType === "vel") {
            //field type for vel is not supported
            continue;
        }
        this._fieldColor[fieldType] = []
        for(var j = 0; j < this._fields[fieldType]["values"].length; j++) {
            this._fieldColor[fieldType].push(this._scale[fieldType](this._fields[fieldType]["values"][j]));
        }        
    }
}

MeshViewer.prototype._setupZoom = function()
{
    var self = this;  // for anonymous functions

    // drag + zoom functionality using d3 behavior
    this._zoomListener = d3.behavior.zoom()
        .scaleExtent([0.5, 50])
        .on('zoom', function() { self._updateTransform(); });
}


MeshViewer.prototype._setupActiveViewMesh = function()
{
    this._divElem = d3.select('#' + this._name);
    
    this._svgElem = this._divElem.append('svg')
        .attr('id', this._name + '_svg')
        .attr('class', 'svgClass')
        .call(this._zoomListener);
    
    this._meshElem = this._svgElem.append('g')
        .attr('id', this._name + '_mesh');

    //render element_centered view
    if(this._inArray(this._fieldTypeActive, this._fieldAssoc["element"])) {
        this._zonesElem = this._meshElem.append('g')
            .attr('id', this._name + '_zones');
        this._setupZones();        

    } else { //render vertex_centered view
        this._vertexElem = this._meshElem.append('g')
            .attr('id', this._name + '_vertices');
        this._setupRadius();
        this._setupVertices();
    }
}

MeshViewer.prototype._removeMesh = function() 
{
    this._svgElem.remove();
}

MeshViewer.prototype._switchFieldType = function(targetfieldType)
{
    if(this._inArray(targetfieldType, this._fieldTypes)) {
        this._fieldTypeActive = targetfieldType;
        this._removeMesh();
        this._setupActiveViewMesh();
        this._computeView();
        this._setupView();
    } else {
        throw new Error("Target view type is currently not supported.")
    }
}

MeshViewer.prototype._setupZones = function()
{
    var self = this;  // for anonymous functions
        
    this._zonesElem.selectAll('.zone')
        .data(Object.keys(this._zones)).enter()
        .append('path')
        .attr('id', function(id) { return self._name + '_z_' + id; })
        .attr('class', 'zoneClass')
        .attr('d', function(id) { return self._createPath(id); })
        .style('fill', function(id) {return self._fieldColor[self._fieldTypeActive][id];})
        .on('mouseover', function() { 
            self._showToolTip();
            d3.select(this)
              .style('fill','red')
              .style('stroke', 'black')
              .style('stroke-width', '0.05')
              .style('opacity', 100);
         })
        .on('mousemove', function(id) { self._updateToolTip(id); })
        .on('mouseout', function(id) { 
            self._hideToolTip(); 
            d3.select(this)
              .style('fill', self._fieldColor[self._fieldTypeActive][id])
              .style('stroke', '')
              .style('stroke-width', '')
        });
}

MeshViewer.prototype._setupVertices = function()
{
    var self = this;

    this._vertexElem.selectAll('.vertex')
        .data(Object.keys(this._vertices)).enter()
        .append('circle')
        .attr('id', function(id) { return self._name + '_v_' + id; })
        .attr('class', 'vertexClass')
        .attr('cx', function(id) { return self._vertices[id][self._dims[0]]; })
        .attr('cy', function(id) { return self._vertices[id][self._dims[1]]; })
        .attr('r', function() { return self._radius; })
        .style('fill', function(id) {return self._fieldColor[self._fieldTypeActive][id];})
        .on('mouseover', function() { 
            self._showToolTip();
            d3.select(this)
              .style('fill','red')
              .style('stroke', 'black')
              .style('stroke-width', '0.05')
              .style('opacity', 100);
         })
        .on('mousemove', function(id) { self._updateToolTip(id); })
        .on('mouseout', function(id) { 
            self._hideToolTip(); 
            d3.select(this)
              .style('fill', self._fieldColor[self._fieldTypeActive][id])
              .style('stroke', '')
              .style('stroke-width', '')
        });        
}


//get the newest views based on current data.
MeshViewer.prototype._computeView = function()
{
    var dims = this._dims;

    this._views[dims[1]+"Max"] = this._findMax(this._nodes[dims[1]]);
    this._views[dims[1]+"Min"] = this._findMin(this._nodes[dims[1]]);
    this._views[dims[0]+"Max"] = this._findMax(this._nodes[dims[0]]);
    this._views[dims[0]+"Min"] = this._findMin(this._nodes[dims[0]]);
}

MeshViewer.prototype._setupView = function()
{
    var dims = this._dims;
    console.log(this._views);
    this._viewBox = [this._views[dims[0] + 'Min'],
                    -this._views[dims[1] + 'Max'],  // flip svg so that y=0 is at bottom
                     this._views[dims[0] + 'Max'] - this._views[dims[0] + 'Min'],
                     this._views[dims[1] + 'Max'] - this._views[dims[1] + 'Min']];
    
    this.updateViewBox();

    this._meshElem.call(this._zoomListener.event);  // initial updateTransform
}


MeshViewer.prototype._setupToolTip = function()
{
    this._toolTip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
}

MeshViewer.prototype._showToolTip = function()
{
    this._toolTip.transition().style('opacity', 100);
}

MeshViewer.prototype._updateToolTip = function(id)
{
    var rect = this._toolTip[0][0].getBoundingClientRect();
    var association = this._fields[this._fieldTypeActive]["association"];
    var unitID;
    if(this._fieldTypeActive === "vertex") {
        unitID = "Vertex: "+ id + "<br>";
    } else { //association is element
        unitID = "Zone: "+ id + "<br>";
    }

    this._toolTip.html(unitID)
        .style('left', (d3.event.pageX - 0.5 * rect.width) + 'px')
        .style('top', (d3.event.pageY - rect.height - 3) + 'px');  // 3px more separation

}

MeshViewer.prototype._hideToolTip = function()
{
    this._toolTip.transition().style('opacity', 0);
}

MeshViewer.prototype._setupRadius = function ()
{
    var sorted_pos0 = this._nodes[this._dims[0]].slice().sort(function(a,b){return a - b});
    var sorted_pos1 = this._nodes[this._dims[1]].slice().sort(function(a,b){return a - b});
    this._radius = Math.min(this._findSmallestDiff(sorted_pos0)/2, this._findSmallestDiff(sorted_pos1)/2);
}

MeshViewer.prototype._findSmallestDiff = function (pos_arr)
{
    var result;
    for(var i = 1; i < pos_arr.length; i++) {
        if(pos_arr[i] != pos_arr[0]) {
            result = pos_arr[i] - pos_arr[0];
            break;
        }
    }
    return result;
}

MeshViewer.prototype._findMax = function(a)
{
    var m = -Infinity, i = 0, n = a.length;

    for (; i != n; ++i) {
        if (a[i] > m) {
            m = a[i];
        }
    }
    return m;   
}

MeshViewer.prototype._findMin = function(a)
{
    var m = Infinity, i = 0, n = a.length;
    for (; i != n; ++i) {
        if (a[i] < m) {
            m = a[i];
        }
    }
    return m;   
}

MeshViewer.prototype._inArray = function(needle, haystack) {
    var length = haystack.length;
    for (var i = 0; i < length; i++) {
        if (haystack[i] === needle)
            return true;
    }
    return false;
}

MeshViewer.prototype._setupGUI = function() {
    var viewControlDiv = d3.select('#view_control')

    for(var i = 0; i < this._fieldTypes.length; i++) {
        var fieldType = this._fieldTypes[i];
        if(fieldType === "vel") {
            continue;
        }
        var text = this._fields[fieldType]["association"] + "-centered " + fieldType;
        var classAttr = "view_option";
        if(this._fieldTypeActive === fieldType) {
            classAttr = classAttr + " " + "active_view";
        }
        viewControlDiv.append('div')
                    .attr('id', fieldType)
                    .attr('class', classAttr)
                    .html(text);
    }

    var self = this;
    d3.selectAll("#view_control .view_option").on("click", function(){
        var activeClass = "active_view";
        var alreadyActive = d3.select(this).classed(activeClass);
        if(!alreadyActive){
            d3.selectAll(".view_option").classed(activeClass, false);
            d3.select(this).classed(activeClass, true);
            var targetFieldType = d3.select(this).attr("id");
            self._switchFieldType(targetFieldType);
        }
    });

    
}