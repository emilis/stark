/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var mpc =               require( "mpc" );
var YAML =              require( "yamljs" );

/// Exports --------------------------------------------------------------------

module.exports = {
    compile:            compile,
    compilePage:        compilePage,
};

/// Functions ------------------------------------------------------------------

function compile( components ){

    return components.map( compilePage.bind( this, {} ));
}///


function compilePage( cCache, component ){

    return {
        name:           component.name,
        content:        fetchContent( getTpl( cCache, component )),
    };
}///


/// Private functions ----------------------------------------------------------

function fetchContent( tpl, vars ){

    vars =              vars || { page: tpl };
    try {
        vars.content =  tpl( vars );
    } catch( e ){
        console.error( "Error:", e, "in", tpl.componentName );
        console.error( tpl.source );
    }

    var layout =        tpl.requirements.layout;

    if ( layout ){
        return fetchContent( layout, vars );
    } else {
        return vars.content;
    }
}///


function getTpl( cCache, component ){

    var exports =       getTplExports( cCache, component );
    var ejsContent =    getTplParts( component ).ejs || "";

    try {
        var tplFn =     _.template( ejsContent );
    } catch( e ){
        console.error( "Error:", e, "in", component.name );
        console.error( ejsContent );
        throw( e );
    }

    return _.extend( tpl, exports );

    function tpl( vars ){

        return tplFn( _.extend( {},
            exports.requirements,
            exports.parts,
            exports.yaml,
            vars ));
    }///
}///


function getTplExports( cCache, component ){

    return {
        componentName:  component.name,
        requirements:   getTplRequirements( cCache, component ),
        parts:          getTplParts( component ),
        yaml:           getYaml( component ),
    };
}///

function getTplRequirements( cCache, component ){
    
    if ( !component.tplRequirements ){

        mpc.fillRequirements( cCache, component );
        
        component.tplRequirements = _.assign(
            component.requiredComponents,
            component.requiredComponents,
            getTpl.bind( cCache ));
    }
    return component.tplRequirements;
}///

function getTplParts( component ){

    if ( !component.tplParts ){
        component.tplParts =        component.parts.reduce( addPart, {} );
    }
    return component.tplParts;

    function addPart( tplParts, part ){

        tplParts[part.partName] =   part.content;
        return tplParts;
    }///
}///

function getYaml( component ){

    if ( !component.yaml ){
        var content =       getTplParts( component ).yaml;
        component.yaml =    content ? YAML.parse( content ) : {};
    }
    return component.yaml;
}///

