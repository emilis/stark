/// Requirements ---------------------------------------------------------------

var mpc =               require( "mpc" );
var modularity =        require( "mpc/modularity" );

/// Constants ------------------------------------------------------------------

var JSNAMESPACE =       "window.Modules";

/// Exports --------------------------------------------------------------------

module.exports = {
    compile:            compile,
};

/// Functions ------------------------------------------------------------------

function compile( components ){

    var prefix =        ";" + JSNAMESPACE + "={};";
    var modules =       components.map( getJsModule );

    return [ prefix ].concat( modules ).join( "\n" );
}///

/// Private functions ----------------------------------------------------------

function getJsModule( component ){

    var exports =       modularity.getExports( component );
    var requirements =  modularity.getRequirements( component );
    var content =       mpc.getPartContent( component, "js" );

    var code =          [];
    var sep =           "";

    if ( content ){
        
        /// Module open:
        code.push(
            ";// Module ", component.name, " ---\n",
            "(function(",
                mapObj( requirements, getVarName ).join( "," ),
            "){\n",
            content,
            ";\n"
        );
        
        /// Exports:
        if ( keys( exports ).length ){
            code.push(
                JSNAMESPACE, '["', component.name, '"] = {', "\n",
                mapObj( exports, getExportLine ).join( ",\n" ),
                "\n};\n"
            );
        }

        /// Imports:
        code.push(
            '})( ',
            mapObj( requirements, getArgumentLine ).join( ", " ),
            " );\n"
        );
    }
    
    return code.join( "" );
}///


function getVarName( v, k ){

    return k.replace( /[^0-9a-z]+/ig, "_" ).replace( /_+/g, "_" );
}///

function getExportLine( v, k ){

    return k + ": " + v;
}///

function getArgumentLine( v ){

    return JSNAMESPACE + '["' + v + '"]';
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

