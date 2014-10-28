/// requirements ---------------------------------------------------------------

var mpc =               require( "mpc" );
var stylus =            require( "stylus" );

/// constants ------------------------------------------------------------------

var PARTNAMES =         [ "styl", "stylus", "css" ];

/// exports --------------------------------------------------------------------

module.exports = {
    partNames:          PARTNAMES,
    compileComponents:  compileComponents,
};

/// functions ------------------------------------------------------------------

function compileComponents( config, components, cb ){

    var content =       components.map( getCssContent ).join( "\n" );

    return stylus.render( content, cb );
}///

function getCssContent( component ){

    var content = [
        "CLASSNAME = '", component.className, "'\n",
        "SELECTOR = '", component.selector, "'\n",
        ];

    for ( var k in component.requirements ){

        isVarName( k ) && content.push( k, "-SELECTOR = '", component.requirements[k].selector, "'\n" );
    }

    content.push(
        mpc.getPartContent( component.mpcComponent, PARTNAMES ));

    return content.join( "" );
}///

function isVarName( str ){

    return !str.match( /[^_a-zA-Z0-9$]/ );
}///

