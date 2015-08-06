/// Requirements ---------------------------------------------------------------

var fs =                require( "fs" );
var mkdirp =            require( "mkdirp" );
var ncp =               require( "ncp" );
var path =              require( "path" );
var Promise =           require( "bluebird" );
var rimraf =            require( "rimraf" );
var YAML =              require( "yamljs" );

var mpc =               require( "mpc" );

var siteComponent =     require( "./lib/site-component" );
var cssCompiler =       require( "./lib/compilers/css" );
var jsCompiler =        require( "./lib/compilers/js" );
var pageCompiler =      require( "./lib/compilers/pages" );

/// Constants ------------------------------------------------------------------

var MPC_INCLUDE_PATH=   [ ".", "lib", "node_modules", "bower_components" ];

/// Exports --------------------------------------------------------------------

module.exports = {
    compileSite:        compileSite,
};

/// Functions ------------------------------------------------------------------

function compileSite( src, dest ){

    src =               path.resolve( src );
    dest =              path.resolve( dest );

    /// Make an empty build directory:
    var cwd =           path.resolve( process.cwd() );
    fs.existsSync( dest ) && rimraf.sync( dest );
    mkdirp.sync( dest );
    if ( cwd === dest ){
        process.chdir( cwd );
    }

    /// Create Site component constructor:
    var getSiteComponent =  siteComponent.bind( this, src, {} );

    /// Read configuration:
    var config =        getConfig( src + "/config", getSiteComponent );
    config.SRC =        src;
    config.DEST =       dest;
    config.pages =      config.pages || src + "/pages";

    if( config.partMap && config.partMap.compiler ){
        config.compiler =   YAML.parse( config.partMap.compiler );
    } else {
        config.compiler =   {};
    }

    /// Create static directory
    mkdirp( dest + "/static" );

    copyStatic(
        src + "/static",
        dest + "/static",
        config );

    compileCss(
        src,
        src + "/index",
        dest + "/static/style.css",
        config, getSiteComponent );

    compileJs(
        src,
        src + "/index",
        dest + "/static/script.js",
        config, getSiteComponent );

    compilePages(
        src,
        src + "/index",
        config.pages,
        dest,
        config, getSiteComponent );
}///


function getConfig( fullPath, getSiteComponent ){

    var mpcOptions = {
        all:                true,
        fillRequirements:   true,
    };

    var components =    mpc.parseComponent( fullPath, mpcOptions );

    if ( !components.length || !components[0] ){
        return {};
    } else {
        return getSiteComponent( components[0] );
    }
}///


function copyStatic( src, dest, config ){

    return fs.existsSync( src ) && ncp.ncp( src, dest );
}///


function compileCss( src, indexName, fileName, config, getSiteComponent ){

    var mpcOptions = {
        all:            true,
        recursive:      true,
        sort:           true,
        includePath:    getIncludePaths( src, MPC_INCLUDE_PATH ),
        parts:          cssCompiler.partNames,
    };

    return Promise
        .resolve( mpc.parseComponent( indexName, mpcOptions ))
        .filter( isNotComponent( indexName ))
        .map( getSiteComponent )
        .then( function( siteComponents ){
            
            return cssCompiler.compileComponents( config, siteComponents )
        })
        .then( function( content ){

            return fs.writeFile( fileName, content );

        }).catch( function( err ){
            
            console.error( "start.compileCss error:", err );
        });
}///


function compileJs( src, indexName, fileName, config, getSiteComponent ){

    var mpcOptions = {
        all:            true,
        recursive:      true,
        sort:           true,
        includePath:    getIncludePaths( src, MPC_INCLUDE_PATH ),
        parts:          jsCompiler.partNames,
    };

    return fs.writeFileSync( fileName,
        jsCompiler.compileComponents(
            config,
            mpc.parseComponent( indexName, mpcOptions )
                .filter( isNotComponent( indexName ))
                .map( getSiteComponent )
        )
    );
}///


function compilePages( src, indexName, pageDir, dest, config, getSiteComponent ){

    var mpcOptions = {
        all:                true,
        fillRequirements:   true,
        includePath:        getIncludePaths( src, MPC_INCLUDE_PATH ),
    };

    var components =        mpc.parseComponent( indexName, mpcOptions );
    if ( fs.existsSync( pageDir )){
        components =        components.concat( mpc.parseDir( pageDir, mpcOptions ));
    }
    components =            components.map( getSiteComponent );

    return pageCompiler
        .compileComponents( config, components )
        .map( savePage );
            
    function savePage( page ){

        var fileName =      dest + page.permalink;
        var dirName =       path.dirname( fileName );

        mkdirp.sync( dirName );
        return fs.writeFile( dest + page.permalink, page.fullContent );
    }///
}///

/// Private functions ----------------------------------------------------------

function isNotComponent( name ){
    return function( mpcComponent ){

        return mpcComponent.name !== name;
    };//
}///


function getIncludePaths( base, paths ){

    return paths.map( prependBase );

    function prependBase( p ){

        return path.resolve( base, p );
    }///
}///
