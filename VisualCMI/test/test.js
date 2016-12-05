var MeshViewer = require('../meshviewer');
var jsdom = require("jsdom");
var assert = require('assert');

/*
describe('Array', function() {
    describe('#indexOf()', function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });
});
*/

describe('MeshViewer', function () {
    describe('MeshViewer(name, document)', function() {
        it('should construct a new MeshViewer with name and document', function () {
            var viewer = new MeshViewer("test", jsdom.jsdom());
            assert.equal("test", viewer._name);
        });

        it()
    });
});