var
    bn = require('bem-naming'),
    Node = require('./node'),
    modUtil = require('util'),
    modPath = require('path'),
    modFs = require('fs');

/**
 * @constructor
 * @augments Node
 * */
var NodeBlock = function() {
    Node.apply(this, arguments);

    // Плоский список файлов в блоке
    this._flat = {};
};


modUtil.inherits(NodeBlock, Node);


/**
 * Инициализация блока
 * @return {NodeBlock}
 * */
NodeBlock.prototype.init = function() {
    if (this.state) return;

    var dir = this._lvName = this._context._dirs[this._lvNumber];

    this.path = modPath.resolve(dir, this.block);
    this.state = 1;

    // TODO некоторые блоки не обьявлены на других уровнях
    // отваливается FS
    this._initFs();
    this._initNextLv();

    return this;
};


/**
 * Инициализация след. уровня переопределения
 * */
NodeBlock.prototype._initNextLv = function(nextLevel) {
    nextLevel == void 0 && (nextLevel = this._lvNumber + 1);

    var
        node,
        dir = this._context._dirs[nextLevel];

    if (!dir) return;

    // Уровень есть, блока на этом уровне нет
    if (!modFs.existsSync(modPath.resolve(dir, this.block))) {
        this._initNextLv(nextLevel + 1);
        return;
    }

    node = this.getNextLevel() || this._context.create(bn.stringify(this));

    if (node.state) return;

    node._lvNumber = nextLevel;

    this.setNextLevel(node);

    node.init();
};


/**
 * Инициализация структуры файлов блока
 * @param {String=} ctxPath - путь директории. Необязательно
 * */
NodeBlock.prototype._initFs = function(ctxPath) {
    if (!ctxPath) ctxPath = this.path;

    if (!modFs.existsSync(ctxPath)) return this;

    var ls = modFs.readdirSync(ctxPath);

    ls.forEach((ls_)=>{
        var path = modPath.resolve(ctxPath, ls_);
        var fstat = modFs.statSync(path);

        if (fstat.isDirectory()) {
            this._initFs(path);
            return;
        }

        this._flat[ls_] = path;
    }, this)
};


/**
 * Получить один элемент или все элементы
 * @param {String | Object=} bem
 * @return {Node}
 * */
NodeBlock.prototype.getElem = function(bem) {
    return this._getALvCNodes(bem, bn.isElem);
};



NodeBlock.prototype.getMod = function(bem) {
    return this._getALvCNodes(bem, bn.isBlockMod);
};


/**
 * Инициализировать все элементы блока
 * Вызывать отдельно, после .init() блока
 * @return {NodeBlock}
 * */
NodeBlock.prototype.initElem = function() {
    // TODO разрешить вопрос об уровнять определения элементов
    // Как инициализировать все элементы на всех уровнях?

    var block = this.getFirstLv();

    for (;;) {
        if (!block) break;

        Object.keys(this._flat).forEach((filename)=>{
            var nodeElem;

            filename = filename.split('.')[0];

            if (!bn.isElem(filename)) return;

            nodeElem = this.getCNode(filename);

            if (nodeElem) return;

            nodeElem = this._context.create(filename);
            this.setCNode(nodeElem);
            nodeElem.init();
        }, this);

        block = block.getNextLevel();
    }

    return this;
};

/**
 * Инициализировать все модификаторы блока
 * Вызывается отдельно, после инициализации блока
 * */
NodeBlock.prototype.initMod = function() {
    var block = this.getFirstLv();

    for (;;) {
        if (!block) break;

        Object.keys(this._flat).forEach((filename)=>{
            var nodeElem;

            filename = filename.split('.')[0];

            if (!bn.isBlockMod(filename)) return;

            nodeElem = this.getCNode(filename);

            if (nodeElem) return;

            nodeElem = this._context.create(filename);
            this.setCNode(nodeElem);
            nodeElem.init();
        }, this);

        block = block.getNextLevel();
    }

    return this;
};


NodeBlock.prototype.getDepsJS = function() {
    var depsJsPath = this._flat[bn.stringify(this) + '.deps.js'];

    if (!depsJsPath) return {};

    return eval(modFs.readFileSync(depsJsPath) + '');
};


module.exports = NodeBlock;