/// Requirements ---------------------------------------------------------------

var fs =                require( "fs" );
var less =              require( "less" );
var mpc =               require( "mpc" );
var mkdirp =            require( "mkdirp" );
var path =              require( "path" );

var jsCompiler =        require( "./lib/compilers/js" );
var pageCompiler =      require( "./lib/compilers/pages" );

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

    var partNames =     [ "less", "css" ];

    var components =    mpc.parseComponent( src, {
        all:            true,
        recursive:      true,
        sort:           true,
        parts:          partNames,
    }).filter( isNotComponent( src ));

    var content =       components.map( getCssContent ).join( "\n" );

    return less.render( content, onCss );

    function onCss( e, css ){

        if ( e ){
            console.error( "stark.compileCss error:", e );
        } else {
            fs.writeFile( dest, css );
        }
    }///

    function getCssContent( component ){

        return mpc.findPartContent( component, partNames );
    }///
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

    src =                       path.resolve( src );
    dest =                      path.resolve( dest );

    var indexPath =             src + "/index";
    var configPath =            src + "/config";
    var pagesPath =             src + "/pages";

    var config =                mpc.parseComponent( configPath, {
        all:                    true,
        fillRequirements:       true,
    })[ 0 ];

    var index =                 mpc.parseComponent( indexPath, {
        all:                    true,
        fillRequirements:       true,
    });

    if ( fs.existsSync( pagesPath )){
        var pages =             mpc.parseDir( pagesPath, {
            all:                true,
            fillRequirements:   true,
        });
    } else {
        var pages =             [];
    }

    var site = {
        sourceDir:              src,
        buildDir:               dest,
        config:                 config && pageCompiler.getYaml( config ) || {},
        pages:                  index.concat( pages ),
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
        } else if ( page.name === indexPath ){
            dirName =           dest;
            fileName =          dirName + "/index.html";
        } else {
            dirName =           page.name.replace( pagesPath, dest );
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

function isNotComponent( name ){
    return function( component ){

        return component.name !== name;
    };//
}///

