/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var marked =            require( "marked" );
var YAML =              require( "yamljs" );

/// Constants ------------------------------------------------------------------

var TPL_PART =          "jst";

/// Exports --------------------------------------------------------------------

module.exports = {
    compile:            compile,
    compilePage:        compilePage,
    getYaml:            getYaml,
};

/// Functions ------------------------------------------------------------------

function compile( components ){

    return components.map( compilePage );
}///


function compilePage( component, site ){

    var page =          getTpl( component );
    var globals =       {
        page:           page,
        site:           site,
    };

    return {
        name:           component.name,
        permalink:      ( page.yaml && page.yaml.permalink ) || null,
        content:        fetchContent( page, globals ),
    };
}///


/// Private functions ----------------------------------------------------------

function fetchContent( tpl, vars ){

    vars =              vars || { page: tpl };
    vars.content =      tpl( vars );

    var layout =        tpl.requirements.layout;

    if ( layout ){
        return fetchContent( layout, vars );
    } else {
        return vars.content;
    }
}///


function getTpl( component ){

    var exports =       getTplExports( component );
    var parts =         getTplParts( component );
    var tplContent =    parts[TPL_PART] || "";
    var tpl;

    if ( tplContent ){
        try {
            var tplFn = _.template( tplContent );
        } catch( e ){
            console.error( "Template Syntax Error:", e, "in", component.name );
            console.error( tplContent );
            throw( e );
        }
        tpl =           runTplFn;

    } else if ( parts["html"] ){
        
        tpl =           _.constant( parts["html"] );
    
    } else if ( parts["php"] ){
        
        tpl =           _.constant( parts["php"] );
    
    } else if ( parts["md"] ){
        
        tpl =           marked.bind( marked, parts["md"] );

    } else if ( parts["markdown"] ){

        tpl =           marked.bind( marked, parts["markdown"] );
    
    } else {
        tpl =           _.constant( "" );
    }

    return _.extend( tpl, exports );
    
    function runTplFn( vars ){

        try {
            return tplFn( _.extend( {},
                { componentName: exports.componentName },
                exports.requirements,
                exports.parts,
                exports.yaml,
                vars ));
        } catch( e ){
            console.error( "Template Execution Error:", e, "in", component.name );
            console.error( tplContent );
        }
    }///
}///


function getTplExports( component ){

    var result = {
        componentName:  component.name,
        requirements:   getTplRequirements( component ),
        parts:          getTplParts( component ),
        yaml:           getYaml( component ),
    };

    return result;
}///

function getTplRequirements( component ){
    
    if ( !component.tplRequirements ){

        component.tplRequirements = _.reduce(
            component.requiredComponents,
            getRequirement,
            {} );
    }
    return component.tplRequirements;

    function getRequirement( res, rcomponent, rname ){
        
        if ( rcomponent ){
            res[rname] =    getTpl( rcomponent );
        } else {
            res[rname] =    Error.bind( Error, "Tried to call missing requirement " + rname + " for " + component.name + "." );
        }
        return res;
    }///
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
