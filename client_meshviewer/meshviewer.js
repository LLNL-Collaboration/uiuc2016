/******************** basic viewer for 2D meshes ********************/

function MeshViewer(name)
{
    this._name = name;
    
    this._divElem = 0;
    this._svgElem = 0;
    this._meshElem = 0;
    this._zonesElem = 0;

    this._dims = [];
    this._nodes = {};
    this._zones = [];

    this._viewBox = [];
    this._viewRes = 0;
    
    this._setupZoom();
    this._setupToolTip();
    
    this._shrink = 0.9;
    this._invShrink = 1 - this._shrink;
}

/******************** public functions ********************/

MeshViewer.prototype.loadData = function(type, data)
{
    if (type === 'rz')
        this._dims = ['z', 'r'];
    else
        this._dims = ['x', 'y'];

    var self = this;  // for anonymous functions
    
    // d3.json(file, function(error, data) {
    self._nodes[self._dims[0]] = data.coordsets.coords.values[self._dims[0]];
    self._nodes[self._dims[1]] = data.coordsets.coords.values[self._dims[1]];

    zones = {}
    var topo = data.topologies.mesh.elements.connectivity;
    for (var i=0; i<topo.length/4; i++) {
        var mesh = topo.slice(i*4, (i+1)*4);
        zones[i] = {
            'nids': mesh
        };
    }

    self._zones = zones;

    self._setupMesh();
    self._setupZones();

    var views = {
        "rMax": 8.9,
        "rMin": 0.0,
        "zMax": 45,
        "zMin": 19
    };

    self._setupView(views);
    // });
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

MeshViewer.prototype._setupZoom = function()
{
    var self = this;  // for anonymous functions

    // drag + zoom functionality using d3 behavior
    this._zoomListener = d3.behavior.zoom()
        .scaleExtent([0.5, 50])
        .on('zoom', function() { self._updateTransform(); });
}

MeshViewer.prototype._setupMesh = function()
{
    this._divElem = d3.select('#' + this._name);
    
    this._svgElem = this._divElem.append('svg')
        .attr('id', this._name + '_svg')
        .attr('class', 'svgClass')
        .call(this._zoomListener);
    
    this._meshElem = this._svgElem.append('g')
        .attr('id', this._name + '_mesh');
    
    this._zonesElem = this._meshElem.append('g')
        .attr('id', this._name + '_zones')
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
        .on('mouseover', function() { self._showToolTip(); })
        .on('mousemove', function(id) { self._updateToolTip(id); })
        .on('mouseout', function() { self._hideToolTip(); });
}

MeshViewer.prototype._setupView = function(view)
{
    var dims = this._dims;
    
    this._viewBox = [view[dims[0] + 'Min'],
                    -view[dims[1] + 'Max'],  // flip svg so that y=0 is at bottom
                     view[dims[0] + 'Max'] - view[dims[0] + 'Min'],
                     view[dims[1] + 'Max'] - view[dims[1] + 'Min']];
    
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
    
    this._toolTip.text('Zone: ' + id)
        .style('left', (d3.event.pageX - 0.5 * rect.width) + 'px')
        .style('top', (d3.event.pageY - rect.height - 3) + 'px');  // 3px more separation
}

MeshViewer.prototype._hideToolTip = function()
{
    this._toolTip.transition().style('opacity', 0);
}
