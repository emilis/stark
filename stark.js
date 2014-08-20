/// Requirements ---------------------------------------------------------------

var ejs =               require( "ejs" );
var fs =                require( "fs" );
var mpc =               require( "mpc" );
var modularity =        require( "mpc/modularity" );

/// Constants ------------------------------------------------------------------

var JSNAMESPACE =       "window.Modules";

/// Exports --------------------------------------------------------------------

module.exports = {
    compileCss:         compileCss,
    compileJs:          compileJs,
    compileEjs:         compileEjs,
};

/// Functions ------------------------------------------------------------------

function compileCss( src, dest ){

    var components =    mpc.parseFile( src, {
        all:            true,
        recursive:      true,
        parts:          [ "css", "less" ],
    });
    var content =       components.map( getPartContent([ "css", "less" ])).join( "\n" );

    return fs.writeFileSync( dest, content );
}///


function compileJs( src, dest ){

    var prefix =        ";" + JSNAMESPACE + "={};\n";
    var content =       mpc.parseFile( src, {
        all:            true,
        recursive:      true,
        sort:           true,
        parts:          [ "js" ],
    }).map( getJsModule ).join( "\n" );

    return fs.writeFileSync( dest, prefix + content );
}///


function compileEjs( src, dest ){

    var component =     mpc.parseFile( src )[0];
    var cCache =        mpc.fillRequirements( {}, component );

    return fs.writeFileSync( dest, fetchEjs( component )() );
}///

/// Private functions ----------------------------------------------------------

function keys( o ){
    return o && Object.getOwnPropertyNames( o ) || [];
}///

function getPartContent( parts ){
    return function( component ){

        for ( var i=0, len=component.parts.length; i<len; i++ ){
            if ( -1 !== parts.indexOf( component.parts[i].partName )){
                return component.parts[i].content;
            }
        }
        return "";
    };//
}///


function getJsModule( component ){

    var exports =       modularity.getExports( component );
    var requirements =  modularity.getRequirements( component );
    var content =       mpc.getPartContent( component, "js" );

    var code =          [];
    var sep =           "";

    if ( content ){
        
        code.push(
            ";\n(function(",
            keys( requirements ).join( "," ),
            "){\n" );
        
        code.push( content, ";\n" );

        code.push( JSNAMESPACE, '["', component.name, '"] = {', "\n" );
        
        sep =           "";
        for ( var k in exports ){
            code.push( sep, k, ": ", exports[k] );
            sep =       ",\n";
        }
        code.push( "\n};\n" );

        /// Imports:
        code.push( '})( ' );
        sep =           "";
        for ( var k in requirements ){
            code.push( sep, JSNAMESPACE, '["', requirements[k], '"]' );
            sep =       ", ";
        }
        code.push( " );\n" );
    }
    
    return code.join( "" );
}///


function fetchEjs( component ){

    var requiredComponents =    component.requiredComponents;
    var tplVars =               {};

    for ( var k in requiredComponents ){
        if ( requiredComponents[k] && mpc.hasPart( requiredComponents[k], "ejs" )){
            tplVars[k] =        fetchEjs( requiredComponents[k] );
        }
    }

    var ejsCode =               mpc.getPartContent( component, "ejs" );
    return ejs.compile( ejsCode ).bind( ejs, tplVars );
}///

function debugObj( obj ){

    console.log( obj && obj.name, Object.getOwnPropertyNames( obj ));
    return obj;
}///
