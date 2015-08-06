/// Requirements ---------------------------------------------------------------

var Promise =           require( "bluebird" );

var cssCompiler =       require( "./css" );
var jsCompiler =        require( "./js" );
var tplCompiler =       require( "./template" );

/// Exports --------------------------------------------------------------------

module.exports = {

    compileComponents:  compileComponents,
};

/// Functions ------------------------------------------------------------------

function compileComponents( config, components ){

    var getTemplate =   tplCompiler.getTemplate.bind( tplCompiler, {} );

    var site =          { config: config };

    return Promise
        .resolve( components )
        .map( getTemplate )
        .map( makePage )
        .then( function( pages ){
            
            site.pages =    pages;
            return pages;

        }).map( compileContent );

    /*
    var pages =         components.map( getTemplate ).map( makePage );

    var site = {
        config:         config,
        pages:          pages,
    };

    return pages.map( compileContent );
    */

    function compileContent( page ){

        page.fullContent =  fetchContent( page, { page:page, site:site });
        return page;
    }///

    function makePage( tpl ){

        var page =      tpl;

        if ( !page.permalink ){
            if ( page.path === "/index" ){
                page.permalink =    "/index.html";
            } else {
                page.permalink =    page.fullPath.slice( config.pages.length ) + "/index.html";
            }
        }

        var hasJsCode = page.partMap.js || page.partMap.ls || page.partMap.livescript || page.partMap["jade-react"];

        if( !page.jsModule && hasJsCode ){
            Object.defineProperty( page, "jsModule", {
                get: function(){
                        return jsCompiler.getJsModule( page );
                }
            });
        }

        if( !page.cssCode && cssCompiler.hasCssParts( page )){
            return cssCompiler
                .compileComponent( page )
                .then( function( cssCode ){

                    page.cssCode =  cssCode;
                    return page;
                });
        }

        return page;
    }///
}///

function fetchContent( template, vars ){

    vars.content =      template( vars );

    var layout =        template.REQUIREMENTS.layout;

    if ( layout ){
        return fetchContent( layout, vars );
    } else {
        return vars.content;
    }
}///
