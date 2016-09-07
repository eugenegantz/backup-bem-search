(()=>{
    var modPath = require('path');
    var modFs = require('fs');
    var modNCP = require('ncp');
    var Context = require('./modules/context');
    var graphUtil = require('./modules/graph-util');

    var ctx = new Context();

    // ------------------------------------------------------------------

    var execArgs = {

        '-selector': function(str) {
            ctx._selector = str;
        },

        '-dir': function() {
            ctx._dirs = Array.prototype.slice.call(arguments, 0).map((path)=> {
                if (modPath.isAbsolute(path))
                    return path;
                return modPath.resolve(process.cwd(), path);
            })
        },

        '-o': function(destPath) {
            ctx._destPath = modPath.isAbsolute(destPath)
                ? destPath
                : modPath.resolve(process.cwd(), destPath);
        }

    };

    execArgs['-lv'] = execArgs['-dir'];
    execArgs['-level'] = execArgs['-dir'];
    execArgs['-levels'] = execArgs['-dir'];
    execArgs['-output'] = execArgs['-o'];

    // ------------------------------------------------------------------
    // Параметры

    console.log(process.argv);

    ((c, method, methodArgs)=>{
        for(c=0; c<process.argv.length; c++){
            if (process.argv[c].match(/^[-]/ig)) {
                if (method && execArgs[method])
                    execArgs[method].apply(this, methodArgs);

                method = process.argv[c];
                methodArgs = [];

            } else {
                (methodArgs || (methodArgs = [])).push(process.argv[c]);
            }

            if (process.argv.length - 1 == c)
                execArgs[method].apply(this, methodArgs);
        }
    })();

    // ------------------------------------------------------------------
    // Инициализация графа

    ctx.initBEM();
    ctx.applyDeps();

    var result = ctx.get(ctx._selector);

    if (!result) {
        console.error(ctx._selector + ' not found');
        return;
    }

    result = result.getLastLv();

    // ------------------------------------------------------------------
    // Вывод

    if (!ctx._destPath) {
        console.error('output argument is not assigned');
        return;
    }

    modNCP(
        modPath.resolve(__dirname, './static'),
        ctx._destPath,
        { clobber: true },
        function(err) {
            if (err) return console.error(err);

            // TODO / BUG: по неизвестной причине NCP callback срабатывает не по факту записи файлов
            setTimeout(()=>{
                var visData = JSON.stringify(graphUtil.build(result));
                var dataJsPath = modPath.resolve(ctx._destPath, 'data.js');

                // modFs.existsSync(dataJsPath) && modFs.unlinkSync(dataJsPath);

                modFs.writeFileSync(dataJsPath, 'var visData = ' + visData);

                console.log('NCP done!');
            }, 1000);
        }
    );

    // ------------------------------------------------------------------

    console.log(result);
})();