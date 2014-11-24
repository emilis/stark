/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var fs =                require( "fs" );
var jade =              require( "jade" );
var mpc =               require( "mpc" );

/// Constants ------------------------------------------------------------------

var JSNAMESPACE =       "window.Modules";
var PARTNAMES =         [ "js" ];
var JADERUNTIME =       __dirname + "/../thirdparty/jade-runtime.js";

/// Exports --------------------------------------------------------------------

module.exports = {
    partNames:          PARTNAMES,
    compileComponents:  compileComponents,
};

/// functions ------------------------------------------------------------------

function compileComponents( config, components ){

    var prefix =        [ ";" + JSNAMESPACE + "={};" ];

    if( components.some( hasJade )){
        prefix.push( fs.readFileSync( JADERUNTIME, "utf8" ));
    }
    var modules =       components.map( getJsModule );
    
    return prefix.concat( modules ).join( "\n" );
}///

/// Private functions ----------------------------------------------------------

function hasJade( component ){

    return !!component.partMap.jade;
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

    var code =          [];

    if ( content ){
        
        /// Module open:
        code.push(
            ";// Module ", component.path, " ---\n",
            "(function(",
                mapObj( component.requirements, getVarName ).join( "," ),
            "){\n",
                component.partMap.jade ?
                    ( "var jadeTemplate = "+ jade.compileClient( component.partMap.jade ) + ";\n" )
                    : "",
                mapObj( internalVars, getVarLine ).join( "\n" ), "\n",
                content, ";\n"
        );
        
        /// Exports:
        if ( keys( component.exports ).length ){
            code.push(
                mapObj( component.exports, getExportLine ).join( "\n" ), "\n",
                JSNAMESPACE, "[\"", component.path, "\"] = exports;\n"
            );
        }

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

function getArgumentLine( v ){

    return JSNAMESPACE + '["' + v.path + '"]';
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


