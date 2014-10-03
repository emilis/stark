/// Requirements ---------------------------------------------------------------

var fs =                require( "fs" );
var less =              require( "less" );
var mpc =               require( "mpc" );
var mkdirp =            require( "mkdirp" );
var path =              require( "path" );

var jsCompiler =        require( "./compilers/js" );
var pageCompiler =      require( "./compilers/pages" );

/// Exports --------------------------------------------------------------------

module.exports = {
    compileCss:         compileCss,
    compileJs:          compileJs,
    compileSite:        compileSite,
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
    }).filter( isNotComponent( src ));

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
    }).filter( isNotComponent( src ));

    return fs.writeFile( dest, jsCompiler.compile( components ));
}///


function compileSite( src, dest ){

    var config =            mpc.parseComponent( src + "/config", {
        all:                true,
        fillRequirements:   true,
    })[0];

    var indexName =         src + "/index";
    var index =             mpc.parseComponent( indexName, {
        all:                true,
        fillRequirements:   true,
    });

    var pages =             mpc.parseDir( src + "/pages", {
        all:                true,
        fillRequirements:   true,
    });

    var site = {
        sourceDir:          src,
        buildDir:           dest,
        config:             config && pageCompiler.getYaml( config ) || {},
        pages:              index.concat( pages ),
    };

    site.pages.map( compileSitePage ).forEach( saveSitePage );


    function compileSitePage( component ){

        return pageCompiler.compilePage( component, site );
    }///

    function saveSitePage( page ){

        var dirName;
        var fileName;

        if ( page.permalink ){
            fileName =          dest + "/" + page.permalink;
            dirName =           path.dirname( fileName );
        } else if ( page.name === indexName ){
            dirName =           dest;
            fileName =          dirName + "/index.html";
        } else {
            dirName =           page.name.replace( src + "/pages", dest );
            fileName =          dirName + "/index.html";
        }

        mkdirp.sync( dirName );
        return fs.writeFile( fileName, page.content );
    }///
}///


function compilePage( src, dest ){

    var component =         mpc.parseComponent( src, {
        all:                true,
        fillRequirements:   true,
    })[0];

    var page =              pageCompiler.compilePage( component );

    return fs.writeFile( dest, page.content );
}///

function compilePages( src, dest ){

    var components =        mpc.parseDir( src, {
        all:                true,
        fillRequirements:   true,
    });

    var pages =             pageCompiler.compile( components );

    pages.forEach( savePage( src, dest ));

    function savePage( src, dest ){
        return function( page ){

            var dirName =   page.name.replace( src, dest );
            var fileName =  dirName + "/index.html";

            mkdirp.sync( dirName );

            return fs.writeFile( fileName, page.content );
        };//
    }///
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


function isNotComponent( name ){
    return function( component ){

        return component.name !== name;
    };//
}///

