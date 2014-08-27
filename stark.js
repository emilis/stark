/// Requirements ---------------------------------------------------------------

var fs =                require( "fs" );
var less =              require( "less" );
var mpc =               require( "mpc" );

var jsCompiler =        require( "./compilers/js" );
var pageCompiler =      require( "./compilers/pages" );

/// Exports --------------------------------------------------------------------

module.exports = {
    compileCss:         compileCss,
    compileJs:          compileJs,
    compilePage:        compilePage,
    compilePages:       compilePages,
};

/// Functions ------------------------------------------------------------------

function compileCss( src, dest ){

    var components =    mpc.parseComponent( src, {
        all:            true,
        recursive:      true,
        sort:           true,
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

    var components =    mpc.parseComponent( src, {
        all:            true,
        recursive:      true,
        sort:           true,
        parts:          [ "js" ],
    });

    return fs.writeFileSync( dest, jsCompiler.compile( components ));
}///


function compilePage( src, dest ){

    var component =         mpc.parseComponent( src, {
        all:                true,
        fillRequirements:   true,
    })[0];

    var page =              pageCompiler.compilePage( {}, component );

    return fs.writeFile( dest, page.content );
}///

function compilePages( src, dest ){

    var components =        mpc.parseDir( src, {
        all:                true,
        fillRequirements:   true,
    });

    var pages =             pageCompiler.compile( components );

    pages.forEach( savePage( src, dest ));
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


function savePage( src, dest ){
    return function( page ){

        var fileName =  page.name.replace( src, dest ) + "/index.html";

        return fs.writeFile( fileName, page.content );
    };//
}///
