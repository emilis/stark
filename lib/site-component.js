/// requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var mpc =               require( "mpc" );
var YAML =              require( "yamljs" );

/// constants ------------------------------------------------------------------

var CLASSPREFIX =       "mpc-";
var YAMLPARTS =         [ "yaml", "yml" ];

/// exports --------------------------------------------------------------------

module.exports =        getSiteComponent;

/// functions ------------------------------------------------------------------

function getSiteComponent( siteDir, cache, mpcComponent ){
    cache =             cache || {};

    if ( !cache[mpcComponent.name] ){

        cache[mpcComponent.name] = makeSiteComponent( siteDir, cache, mpcComponent );
    }

    return cache[mpcComponent.name];
}///

function makeSiteComponent( siteDir, cache, mpcComponent ){

    var path =          getName( siteDir, mpcComponent.name );
    var className =     getClassName( path );
    var selector =      "." + className;

    var partMap =       getPartMap( mpcComponent );

    return {
        path:           path,
        className:      className,
        selector:       selector,
        fullPath:       mpcComponent.name,
        mpcComponent:   mpcComponent,
        parts:          mpcComponent.parts,
        partMap:        partMap,
        requirements:   getRequirements( siteDir, cache, mpcComponent ),
        exports:        mpc.getExports( mpcComponent ),
        yaml:           getYaml( mpcComponent ),
    };
}///


function getName( siteDir, mpcName ){

    return mpcName.slice( siteDir.length );
}///

function getClassName( path ){

    return ( CLASSPREFIX + path ).replace( /[^ _a-z0-9A-Z]+/g, "-" );
}///

function getPartMap( component ){

    return component.parts.reduce( addPart, {} );

    function addPart( partMap, part ){

        if ( partMap[part.partName] ){
            partMap[part.partName] +=   "\n" + part.content;
        } else {
            partMap[part.partName] =    part.content;
        }
        return partMap;
    }///
}///



function getRequirements( siteDir, cache, mpcComponent ){

    return _.reduce( mpcComponent.requiredComponents, addRequirement, {} );

    function addRequirement( res, rcomponent, rname ){

        res[rname] =    getSiteComponent( siteDir, cache, rcomponent );
        return res;
    }///
}///

function getYaml( component ){

    var content =       mpc.getPartContent( component, YAMLPARTS );

    return content ? YAML.parse( content ) : {};
}///

