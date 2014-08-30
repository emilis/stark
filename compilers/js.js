/// Requirements ---------------------------------------------------------------

var mpc =               require( "mpc" );
var YAML =              require( "yamljs" );

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

    var exports =       mpc.getExports( component );
    var requirements =  mpc.getRequirements( component );
    var content =       mpc.getPartContent( component, "js" );

    var internalVars =  {
            MODULE_ID:  component.name,
            yaml:       YAML.parse( mpc.getPartContent( component, "yaml" )),
            ejs:        mpc.getPartContent( component, "ejs" ),
    };

    var code =          [];

    if ( content ){
        
        /// Module open:
        code.push(
            ";// Module ", component.name, " ---\n",
            "(function(",
                mapObj( requirements, getVarName ).join( "," ),
            "){\n",
                mapObj( internalVars, getVarLine ).join( "\n" ), "\n",
                content, ";\n"
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

function getVarLine( v, k ){

    return "var " + k + " = " + JSON.stringify( v ) + ";";
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


