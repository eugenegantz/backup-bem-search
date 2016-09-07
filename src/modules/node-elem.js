var Node = require('./node');
var NodeBlock = require('./node-block');
var modUtil = require('util');
var modFs = require('fs');
var bn = require('bem-naming');

/**
 * @constructor
 * @augments Node
 * */
var NodeElem = function() {
    Node.apply(this, arguments);
};


modUtil.inherits(NodeElem, Node);


/**
 * Инициализирует элемент.
 * @return {NodeElem}
 * */
NodeElem.prototype.init = function() {
    if (this.state) return;

    var parent = this.getPNode(); // блок на уровне которого определен элемент

    if (!parent)
        throw new Error('Parent-block node is undefined');

    var selector = bn.stringify(this);

    var exist = Object.keys(parent._flat).some((filename)=>{
        return !!filename.match(selector);
    });

    if (!exist)
        throw new Error(selector + ' not found in block directory');

    this._initNextLv();

    this.state = 1;

    // TODO указывать уровень, название уровня, связать уровень элемента и блока

    return this;
};


NodeElem.prototype._initNextLv = function() {
    var
        block = this.getPNode(),
        nextLvBlock = block.getNextLevel(),
        selector = bn.stringify(this),
        exist,
        node;

    // TODO зацикливание где-то в elems

    for (;;) {
        if (!nextLvBlock) return;

        exist = Object.keys(nextLvBlock._flat).some((filename)=>{
            return !!filename.match(selector);
        });

        if (!exist) {
            nextLvBlock = nextLvBlock.getNextLevel();
            continue;
        }

        node = this._context.create(bn.stringify(this));
        nextLvBlock.setCNode(node);
        node.init();

        nextLvBlock = nextLvBlock.getNextLevel();
    }
};


/**
 * Инициализирует модификаторы элемента.
 * Вызывается отдельно, после инициализации элемента
 * @return {NodeElem}
 * */
NodeElem.prototype.initMod = function() {
    var elem = this.getFirstLv();
    var block;

    // TODO

    for (;;) {
        if (!elem) break;

        block = elem.getPNode();

        Object.keys(block._flat).forEach((filename)=>{
            var nodeMod;

            filename = filename.split('.')[0];

            if (!bn.isElemMod(filename)) return;

            nodeMod = this.getCNode(filename);

            if (nodeMod) return;

            nodeMod = this._context.create(filename);
            this.setCNode(nodeMod);
            nodeMod.init();
        }, this);

        elem = elem.getNextLevel();
    }

    return this;
};


/**
 * Получить блок элемента
 * @return {Node}
 * */
NodeElem.prototype.getBlock = function() {
    return this.getPNode().getLastLv();
};


NodeElem.prototype.getMod = function(bem) {
    return this._getALvCNodes(bem, bn.isElemMod);
};


NodeElem.prototype.getDepsJS = function() {
    var depsJsPath = this.getPNode()._flat[bn.stringify(this) + '.deps.js'];

    if (!depsJsPath) return {};

    return eval(modFs.readFileSync(depsJsPath) + '');
};


module.exports = NodeElem;