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
    var basePath =      components.reduce( getShortestPath, null );
    var modules =       components.map( getJsModule.bind( this, basePath ));

    return [ prefix ].concat( modules ).join( "\n" );
}///

/// Private functions ----------------------------------------------------------

function getJsModule( basePath, component ){

    var moduleName =    getModuleName( basePath, component.name );
    var exports =       mpc.getExports( component );
    var requirements =  mpc.getRequirements( component );
    var content =       mpc.getPartContent( component, "js" );

    var internalVars =  {
            MODULE_ID:  moduleName,
            exports:    {},
            yaml:       YAML.parse( mpc.getPartContent( component, "yaml" )),
            jst:        mpc.getPartContent( component, "jst" ),
    };

    var code =          [];

    if ( content ){
        
        /// Module open:
        code.push(
            ";// Module ", moduleName, " ---\n",
            "(function(",
                mapObj( requirements, getVarName ).join( "," ),
            "){\n",
                mapObj( internalVars, getVarLine ).join( "\n" ), "\n",
                content, ";\n"
        );
        
        /// Exports:
        if ( keys( exports ).length ){
            code.push(
                mapObj( exports, getExportLine ).join( "\n" ), "\n",
                JSNAMESPACE, "[\"", moduleName, "\"] = exports;\n"
            );
        }

        /// Imports:
        code.push(
            '})( ',
                mapObj( requirements, getArgumentLine.bind( this, basePath )).join( ", " ),
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

function getArgumentLine( basePath, v ){

    return JSNAMESPACE + '["' + getModuleName( basePath, v ) + '"]';
}///

function getShortestPath( curPath, component ){

    if ( curPath === null ){
        return component.name;
    } else if ( !curPath.length ){
        return curPath;
    } else {
        var name =      component.name;
        var len =       Math.min( curPath.length, name.length );
        var i =         0;
        while ( i < len && curPath[i] === name[i] ){
            i++;
        }
        return curPath.slice( 0, i );
    }
}///

function getModuleName( basePath, name ){

    /// Return name unchanged if it does not start with basePath:
    if ( name.indexOf( basePath )){
        return name;
    } else {
        return name.slice( basePath.length );
    }
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


