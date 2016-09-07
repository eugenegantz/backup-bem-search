var bn = require('bem-naming');

/**
 * Модель узла
 * @constructor
 * */
var Node = function(bem) {

    this._prevLv = void 0;
    this._nextLv = void 0;
    this._lvNumber = 0; // уровень = 0 - это базовый уровень переопределения
    this._lvName = '';

    // Экземпляр контекста
    this._context = void 0;

    // Подчиненные узлы: модификаторы, элементы
    this._cNodes = Object.create(null);

    // Родительский узел
    this._pNode = void 0;

    // Путь к узлу
    this.path = '';

    // Узлы от которых зависит данный узел
    this.deps = [];

    // Зависимости плоским списком записанные в формате объектов БЭМ-именования
    this._flatDeps = [];

    // Узлы которые зависят от данного узла
    this.outerDeps = [];

    if (typeof bem == 'string')
        bem = bn.parse(bem);

    Object.keys(bem).forEach((key)=> {
        this[key] = bem[key];
    }, this);

    // Состояние инициализации
    this.state = 0;
};


/**
 * Получить пред. уровень переопределения
 * @return {Object | undefined}
 * */
Node.prototype.getPrevLevel = function() {
   return this._prevLv;
};


/**
 * Получить след. уровень переопределения
 * @return {Object | undefined}
 * */
Node.prototype.getNextLevel = function() {
    return this._nextLv;
};


/**
 * Установить пред. уровень переопределения
 * @param {Node} node
 * @return {Node}
 * */
Node.prototype.setPrevLevel = function(node) {
    this._prevLv = node;
    node.getNextLevel() != this && node.setNextLevel(this);

    return this;
};


/**
 * Установить след. уровень переопределения
 * @param {Node} node
 * @return {Node}
 * */
Node.prototype.setNextLevel = function(node) {
    this._nextLv = node;
    node.getPrevLevel() != this && node.setPrevLevel(this);

    return this;
};


/**
 * Получить последний доступный уровень переопределения
 * @return {Node}
 * */
Node.prototype.getLastLv = function() {
    var node = this.getNextLevel();

    return (node && node.getLastLv()) || node || this;
};


/**
 * Получить первый доступный уровень переопределения
 * @return {Node}
 * */
Node.prototype.getFirstLv = function() {
    var node = this.getPrevLevel();

    return (node && node.getFirstLv()) || node || this;
};


/**
 * Получить подчиненный узел или узлы
 * @param {Object=} bem - Объект в формате БЭМ-именования
 * @return {Node}
 * */
Node.prototype.getCNode = function(bem) {
    if (!bem) return this._cNodes;

    if (typeof bem == 'object')
        bem = bn.stringify(bem);

    return this._cNodes[bem];
};


/**
 * Добавить подчиненный узел
 * @param {Node} node - подчиненный узел
 * @return {Node}
 * */
Node.prototype.setCNode = function(node) {
    this._cNodes[bn.stringify(node)] = node;
    node.setPNode(this);

    return this;
};


/**
 * Получить родительский узел
 * @return {Node}
 * */
Node.prototype.getPNode = function() {
    return this._pNode;
};


/**
 * Установить родительский узел
 * @param {Node} node - родительский узел
 * */
Node.prototype.setPNode = function(node) {
    this._pNode = node;

    return this;
};


Node.prototype._getALvCNodes = function(bem, validFn) {
    var node, nodes = [];
    var block = this.getLastLv();

    for (;;) {
        if (!block) break;

        if (bem) {
            node = block.getCNode(bem);
            if (node) return node;

        } else {
            Object.keys(block._cNodes).forEach((cNodeName)=>{
                if (!validFn(cNodeName)) return;
                nodes.push(block._cNodes[cNodeName]);
            });
        }

        block = block.getPrevLevel();
    }

    return nodes.length ? nodes : void 0;
};


/**
 * Инициализует плоский список зависимостей
 * @return {Node}
 * */
Node.prototype.initDeps = function() {
    // TODO В Deps по неизвестной причине происходит зацикливание
    var
        self = this,
        depsJS = [].concat(this.getDepsJS()),
        depsArr = depsJS.reduce((prev, curr)=>{
            return prev.concat(curr.mustDeps || [], curr.shouldDeps || []);
        }, []);

    this._flatDeps = depsArr.reduce((prev, dep)=>{
        if (typeof dep == 'string' || !dep.elems && !dep.elem)
            return prev.concat(self._initDepsBlock(dep));

        return prev.concat(self._initDepsElem(dep.elem || dep.elems));
    }, []);

    // Выпиливает совпадения
    this._flatDeps = this._flatDeps.filter(dep => bn.stringify(dep) != bn.stringify(this));

    return this;
};


Node.prototype._initDepsBlock = function(dep) {
    if (typeof dep == 'string')
        return [{ block: dep }];

    var obj = { block: dep.block || this.block };

    if (dep.mod)
        return this._initDepsMod(obj, { [dep.mod]: dep.val || true });

    if (dep.mods)
        return this._initDepsMod(obj, dep.mods);

    return [obj];
};


Node.prototype._initDepsElem = function(dep) {
    var obj = {}, self = this;

    if (typeof dep == 'string') {
        return [{block: this.block, elem: dep}];

    } else if (Array.isArray(dep)) {
        return dep.reduce((prev, dep)=>{
            return prev.concat(self._initDepsElem(dep));
        }, []);

    } else if (typeof dep == 'object') {
        obj.block = dep.block || this.block;
        obj.elem = dep.elem;

        if (dep.mods)
            return this._initDepsMod(obj, dep.mods);

        if (dep.mod)
            return this._initDepsMod(obj, { [dep.mod]: dep.val || true });

        return [obj];
    }

    return [];
};


Node.prototype._initDepsMod = function(dep, mods) {
    var clone = function(obj) {
        var cloned = {};

        for (var prop in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, prop)) continue;
            cloned[prop] = obj[prop];
        }

        return cloned;
    };

    return Object.keys(mods).map((modName)=>{
        var cloned = clone(dep);
        cloned.modName = modName;
        cloned.modVal = mods[modName];
        return cloned;
    });
};


Node.prototype.getDepsJS = function() {
    // Переопределяется
    return {};
};


/**
 * Получить все зависимости для данного узла
 * */
Node.getDeps = function() {
    // TODO
};


Node.prototype.matchLv = function(node1, node2) {
    // TODO
};


/**
 * Инициализация узла. Переопределяется в наследовании
 * */
Node.prototype.init = function() {
    this.state = 1;
};


module.exports = Node;