var bn = require('bem-naming');

module.exports = {

    clone: function(obj) {
        var cloned = {};

        for (var prop in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, prop)) continue;
            cloned[prop] = obj[prop];
        }

        return cloned;
    },


    _nodeTpl: {
        id: '',
        size: 150,
        label: '',
        color: '#FFA500',
        shape: 'box',
        font: {
            face: 'monospace',
            align: 'left'
        }
    },


    _edgeTpl: {
        from: '',
        to: '',
        arrows: 'to',
        physics: false,
        smooth: {
            type: 'cubicBezier'
        }
    },


    build: function(node) {
        var data = { nodes: [], edges: [] };

        // TODO оптимизировать

        this._buildFlat(node)
            .forEach((bemNode, c)=>{
                var vizNode = this.clone(this._nodeTpl);
                vizNode.id = c;
                vizNode.label = bn.stringify(bemNode);
                vizNode._bemNode = bemNode;
                bemNode._visNode = vizNode;
                data.nodes.push(vizNode);
           });

        data.nodes.forEach((vizNode, c)=>{
            vizNode._bemNode.outerDeps.forEach((bemNode)=>{
                var edge = this.clone(this._edgeTpl);
                edge.from = bemNode._visNode.id;
                edge.to = vizNode.id;
                data.edges.push(edge);
            });
        });

        data.nodes.forEach((vizNode, c)=>{
            vizNode._bemNode.outerDeps.forEach((bemNode)=>{
                delete bemNode._isFlattened;
                delete bemNode._visNode;
            });
            delete vizNode._bemNode;
        });

        return data;
    },


    _buildFlat: function(node) {
        if (node._isFlattened) return [];
        node._isFlattened = 1;

        return node.outerDeps.reduce((prev, node_)=>{
            return prev.concat(this._buildFlat(node_));
        }, [node]);
    }

};