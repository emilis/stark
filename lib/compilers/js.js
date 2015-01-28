/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var fs =                require( "fs" );
var jade =              require( "jade" );
var mpc =               require( "mpc" );

/// Constants ------------------------------------------------------------------

var JSNAMESPACE =       "window.Modules";
var PARTNAMES =         [ "js" ];

var JADEPARTNAME =      "jade";
var JADETPLNAME =       "jadeTemplate";
var _JADETPLNAME =      "_jadeTemplate";
var JADERUNTIME =       __dirname + "/../thirdparty/jade-runtime.js";

/// Exports --------------------------------------------------------------------

module.exports = {
    partNames:          PARTNAMES,
    compileComponents:  compileComponents,
};

/// functions ------------------------------------------------------------------

function compileComponents( config, components ){

    var options =       config && config.compiler && config.compiler.js || {};
    options.nowrap =    options.nowrap || [];

    var prefix =        [ ";" + JSNAMESPACE + "={};" ];

    if( components.some( hasJade )){
        prefix.push( fs.readFileSync( JADERUNTIME, "utf8" ));
    }
    var modules =       components.map( getCode );
    
    return prefix.concat( modules ).join( "\n" );

    function getCode( component ){

        if( options.nowrap.indexOf( component.path ) !== -1 ){
            if ( component.partMap.js ){
                return ";\n" + component.partMap.js + ";\n";
            } else {
                return "";
            }
        } else {
            return getJsModule( component );
        }
    }///
}///

/// Private functions ----------------------------------------------------------

function hasJade( component ){

    return JADEPARTNAME in component.partMap;
}///

function getJsModule( component ){

    var content =       component.partMap.js;

    var internalVars =  _.extend(
        {
            yaml:       component.yaml,
            jst:        component.partMap.jst
        },
        component.yaml,
        {
            PATH:       component.path,
            CLASSNAME:  component.className,
            SELECTOR:   component.selector,
            exports:    {},
        });

    var exports =       _.extend( {}, component.exports );
    if( hasJade( component )){
        exports[ _JADETPLNAME ] = JADETPLNAME;
    }

    var code =          [];

    if ( content ){
        
        /// Module open:
        code.push(
            ";// Module ", component.path, " ---\n",
            "(function(",
                mapObj( component.requirements, getVarName ).join( "," ),
            "){\n",
                getJadeTemplate( component ),
                mapObj( internalVars, getVarLine ).join( "\n" ), "\n",
                content, ";\n"
        );
        
        /// Exports:
        code.push(
            mapObj( exports, getExportLine ).join( "\n" ), "\n"
        );

        component.partMap[ JADEPARTNAME ] && code.push(
            mapObj( exports, getJadeExportLine ).join( "\n" ), "\n"
        );

        code.push(
            JSNAMESPACE, "[\"", component.path, "\"] = exports;\n"
        );

        /// Imports:
        code.push(
            '})( ',
                mapObj( component.requirements, getArgumentLine ).join( ", " ),
            " );\n"
        );
    }
    
    return code.join( "" );
}///


function getVarName( v, k ){

    return k.replace( /[^0-9a-z]+/ig, "_" ).replace( /_+/g, "_" );
}///

function getVarLine( v, k ){

    return "var " + k + " = " + JSON.stringify( v ) + ";";
}///

function getExportLine( v, k ){

    return "exports." + k + "= " + v + ";";
}///

function getJadeExportLine( v, k ){
    
    if( k === _JADETPLNAME ){
        return "";
    } else {
        return "exports." + _JADETPLNAME + "." + k + "= " + v + ";";
    }
}///

function getArgumentLine( v ){

    return JSNAMESPACE + '["' + v.path + '"]';
}///

/// Jade template --------------------------------------------------------------

function getJadeTemplate( component ){

    if( !component.partMap[ JADEPARTNAME ] ){
        return "";
    } else {

        return [
            "var ", JADETPLNAME, " = ",
            "(function(", 
                mapObj( component.requirements, getVarName ).join( "," ),
            "){\nreturn ",
                jade.compileClient( component.partMap[ JADEPARTNAME ] ),
            ";\n})(",
                mapObj( component.requirements, getJadeVar ).join( "," ),
            ");\n"
        ].join( "" );
    }

    function getJadeVar( v, k ){

        var name =      getVarName( v, k );

        if( !v.partMap[ JADEPARTNAME ] ){
            return name
        } else {
            return name + "&&" + name + "." + _JADETPLNAME + "||" + name;
        }
    }///
}///

/// Utilities ------------------------------------------------------------------

function keys( o ){
    return o && Object.getOwnPropertyNames( o ) || [];
}///

function mapObj( o, fn ){

    return keys( o ).map( callFn );

    function callFn( k ){
        return fn( o[k], k, o );
    }///
}///


