/// Requirements ---------------------------------------------------------------

var jsCompiler =        require( "./js" );
var tplCompiler =       require( "./template" );

/// Exports --------------------------------------------------------------------

module.exports = {

    compileComponents:  compileComponents,
};

/// Functions ------------------------------------------------------------------

function compileComponents( config, components ){

    var getTemplate =   tplCompiler.getTemplate.bind( tplCompiler, {} );

    var pages =         components.map( getTemplate ).map( makePage );

    var site = {
        config:         config,
        pages:          pages,
    };

    return pages.map( compileContent );

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

        var hasJsCode = page.partMap.js || page.partMap.ls || page.partMap.livescript;

        if( !page.jsModule && hasJsCode ){
            Object.defineProperty( page, "jsModule", {
                get: function(){
                        return jsCompiler.getJsModule( page );
                }
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
