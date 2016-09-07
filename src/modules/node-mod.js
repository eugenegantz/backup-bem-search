var Node = require('./node');
var modUtil = require('util');
var bn = require('bem-naming');

var NodeMod = function() {
    Node.apply(this, arguments);
};


modUtil.inherits(NodeMod, Node);


/**
 * Инициализация модификатора
 * @return {NodeMod}
 * */
NodeMod.prototype.init = function() {
    if (this.state) return;

    var parent = this.getPNode();
    var block = this._getCurrLvBlock();

    if (!parent)
        throw new Error('parent node is undefined');

    var selector = bn.stringify(this);

    var exist = Object.keys(block._flat).some((filename)=>{
        return !!filename.match(selector);
    });

    if (!exist)
        throw new Error(selector + ' not found in block directory');

    this._initNextLv();

    this.state = 1;

    return this;
};


/**
 * Инициализировать след. уровень переопределения
 * */
NodeMod.prototype._initNextLv = function() {
    // TODO

    var
        parent = this.getPNode(),
        block = this._getCurrLvBlock(),
        nextLvParent = parent.getNextLevel(),
        nextLvBlock = block.getNextLevel(),
        selector = bn.stringify(this),
        exist,
        node;

    for (;;) {
        if (!nextLvParent) return;

        exist = Object.keys(nextLvBlock._flat).some((filename)=>{
            return !!filename.match(selector);
        });

        if (!exist) {
            nextLvParent = nextLvParent.getNextLevel();
            nextLvBlock = nextLvBlock.getNextLevel();
            continue;
        }

        node = this._context.create(bn.stringify(this));
        nextLvParent.setCNode(node);
        node.init();

        nextLvParent = nextLvParent.getNextLevel();
        nextLvBlock = nextLvBlock.getNextLevel();
    }
};


/**
 * Получить блок в котором лежит модификатор для текущего уровня определения
 * @return {Node}
 * */
NodeMod.prototype._getCurrLvBlock = function() {
    var parent = this.getPNode();

    if (bn.isElem(parent) && bn.isElemMod(this)) {
        return parent.getPNode()

    } else if (bn.isBlock(parent) && bn.isBlockMod(this)) {
        return parent

    } else {
        throw new Error('Wrong parent of mod');
    }
};


/**
 * Получить блок в котором лежит модификатор
 * @return {Node}
 * */
NodeMod.prototype.getBlock = function() {
    return this._getCurrLvBlock().getLastLv();
};


NodeMod.prototype.getDepsJS = function() {
    var depsJsPath = this._getCurrLvBlock()._flat[bn.stringify(this) + '.deps.js'];

    if (!depsJsPath) return {};

    return eval(modFs.readFileSync(depsJsPath) + '');
};