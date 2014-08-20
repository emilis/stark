/// Requirements ---------------------------------------------------------------

var ejs =               require( "ejs" );
var fs =                require( "fs" );
var less =              require( "less" );
var mpc =               require( "mpc" );
var modularity =        require( "mpc/modularity" );

var jsCompiler =        require( "./compilers/js" );

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

    return less.render( content, onCss );

    function onCss( e, css ){

        if ( e ){
            console.error( "stark.compileCss error:", e );
        } else {
            fs.writeFile( dest, css );
        }
    }
}///


function compileJs( src, dest ){

    var components = mpc.parseFile( src, {
        all:        true,
        recursive:  true,
        sort:       true,
        parts:      [ "js" ],
    });

    return fs.writeFileSync( dest, jsCompiler.compile( components ));
}///


function compileEjs( src, dest ){

    var component =     mpc.parseFile( src )[0];
    var cCache =        mpc.fillRequirements( {}, component );

    return fs.writeFileSync( dest, fetchEjs( component )() );
}///

/// Private functions ----------------------------------------------------------

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
