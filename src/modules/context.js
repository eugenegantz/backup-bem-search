var modFs = require('fs');
var modPath = require('path');
var bn = require('bem-naming');
var Node = require('./node');

/**
 * Строитель + локатор
 * @constructor
 * */
var Context = function(options) {

    !options && (options = {});

    if (options.dirs)
        this._dirs = options.dirs;

    this._storage = {};

};


/**
 * Создает экземпляр узла
 * @param {Object} bem - объект в формате БЭМ-наименования
 * @param {function} constructor
 * @return {Node | undefined}
 * */
Context.prototype.create = function(bem, constructor) {
    var
        NodeB = require('./node-block'),
        NodeE = require('./node-elem'),
        NodeM = require('./node-elem');


    if (typeof constructor != 'function') {
        if (bn.isBlock(bem))
            constructor = NodeB;

        if (bn.isElem(bem))
            constructor = NodeE;

        if (bn.isBlockMod(bem) || bn.isElemMod(bem))
            constructor = NodeM;
    }

    var node = new constructor(bem);
    node._context = this;

    return node;
};


/**
 * Возвращает экземпляр узла
 * @return {Node}
 * */
Context.prototype.get = function(selector) {
    if (typeof selector == 'object')
        selector = bn.stringify(selector);

    return this._storage[selector];
};


/**
 * Записывает в локатор экземпляр блока
 * @param {Node} node
 * */
Context.prototype.add = function(node) {
    this._storage[bn.stringify(node)] = node;
};


Context.prototype.initBEM = function() {
    this._dirs.forEach((dir, levelNumber)=>{
        var ls = modFs.readdirSync(dir);

        ls.forEach((blockName)=>{
            var block = this.get(blockName);

            if (block) return;

            block = this.create(blockName);
            block._lvNumber = levelNumber;

            block.init();
            block.initDeps();
            block.initElem();
            block.initMod();

            var elems = block.getElem();
            var mods = block.getMod();

            mods && mods.forEach((mod)=>{
                mod.init();
                mod.initDeps();
                this.add(mod.getLastLv());
            }, this);

            elems && elems.forEach((elem)=>{
                if (this.get(elem)) return;

                elem.init();
                elem.initDeps();
                elem.initMod();

                var mods = elem.getMod();

                mods && mods.forEach((mod)=>{
                    mod.init();
                    mod.initDeps();
                    this.add(mod.getLastLv());
                }, this);

                this.add(elem.getLastLv());
            }, this);

            this.add(block.getLastLv());
        }, this);

    }, this);
};


Context.prototype.applyDeps = function() {
    var self = this;

    Object.keys(this._storage).forEach(function(selector) {
        var node = self.get(selector).getLastLv();

        for (;;) {
            if (!node) return;

            node.deps = node._flatDeps.map(function(dep) {
                var depNode = self.get(dep);

                if (!depNode || depNode == this) return dep;

                depNode = depNode.getLastLv();

                // Где this - это node
                !~depNode.outerDeps.indexOf(this) && depNode.outerDeps.push(this);

                return depNode;
            }, node);

            node = node.getPrevLevel();
        }
    });
};


module.exports = Context;