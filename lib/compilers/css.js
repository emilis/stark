/// requirements ---------------------------------------------------------------

var less =              require( "less" );
var mpc =               require( "mpc" );

/// constants ------------------------------------------------------------------

var PARTNAMES =         [ "less", "css" ];

/// exports --------------------------------------------------------------------

module.exports = {
    partNames:          PARTNAMES,
    compileComponents:  compileComponents,
};

/// functions ------------------------------------------------------------------

function compileComponents( config, components, cb ){

    var content =       components.map( getCssContent ).join( "\n" );

    return less.render( content, cb );
}///

function getCssContent( component ){

    return mpc.getPartContent( component.mpcComponent, PARTNAMES );
}///

