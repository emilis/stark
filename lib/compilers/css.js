/// Requirements ---------------------------------------------------------------

var mpc =               require( "mpc" );
var Promise =           require( "bluebird" );
var stylus =            require( "stylus" );

/// Constants ------------------------------------------------------------------

var PARTNAMES =         [ "styl", "stylus", "css" ];

/// Main -----------------------------------------------------------------------

Promise.promisifyAll( stylus );

/// Exports --------------------------------------------------------------------

module.exports = {
    partNames:          PARTNAMES,

    hasCssParts:        hasCssParts,
    compileComponents:  compileComponents,
    compileComponent:   compileComponent,
};
    

/// Functions ------------------------------------------------------------------

function hasCssParts( component ){

    return component.partMap.css || component.partMap.styl || component.partMap.stylus;
}///


function compileComponents( config, components ){

    var content =       components.map( getStylusCode ).join( "\n" );

    return stylus.renderAsync( content );
}///


function compileComponent( component ){

    return stylus.renderAsync( getStylusCode( component ));
}///


/// Private functions ----------------------------------------------------------

function getStylusCode( component ){

    var content = [
        "CLASSNAME = '", component.className, "'\n",
        "SELECTOR = '", component.selector, "'\n",
        ];

    for ( var k in component.requirements ){

        isVarName( k ) && content.push( k, "-SELECTOR = '", component.requirements[k].selector, "'\n" );
    }

    return component.parts.reduce( addCssPart, content ).join( "" );


    function addCssPart( content, part ){

        switch( part.partName ){

            case "stylus":
            case "styl":
            
                content.push( part.content );
                break;

            case "css":
                
                content.push( "@css{ ", part.content, "}" );
                break;
        }

        return content;
    }///
}///

function isVarName( str ){

    return !str.match( /[^_a-zA-Z0-9$]/ );
}///

