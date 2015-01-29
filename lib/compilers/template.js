/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var marked =            require( "marked" );
var jade =              require( "jade" );
var reactJade =         require( "react-jade" );
var react =             require( "react" );

/// exports --------------------------------------------------------------------

module.exports = {
    getTemplate:        getTemplate,
    makeTemplate:       makeTemplate,
};

/// functions ------------------------------------------------------------------

function getTemplate( cache, component ){

    if ( !cache[component.path] ){
        cache[component.path] = makeTemplate( cache, component );
    }
    return cache[component.path];
}


function makeTemplate( cache, component ){

    var requirements =  {};

    for ( var k in component.requirements ){
        requirements[k] =   getTemplate( cache, component.requirements[k] );
    }

    var exports = _.extend( {},
        component,
        requirements,
        component.partMap,
        {
            requirements:   component.requirements,
            yaml:           component.yaml
        },
        component.yaml
    );

    var constants = {
        PATH:           component.path,
        CLASSNAME:      component.className,
        SELECTOR:       component.selector,
        PARTS:          component.parts,
        PARTMAP:        component.partMap,
        REQUIREMENTS:   requirements,
        EXPORTS:        component.exports,
    };

    var tplFn =         getTplFn( component, exports, constants );

    var template =      _.extend( tplFn, exports, constants );
    Object.defineProperty( template, "content", { get: function(){ return tplFn(); }});

    return template;
}///

/// private functions ----------------------------------------------------------

function getTplFn( component, exports, constants ){

    var partMap =       component.partMap;

    var fnMap = {
        jst:            getCompiledTpl( _.template.bind( _ )),
        jade:           getCompiledTpl( jade.compile.bind( jade )),
        "jade-react":   getJadeReactTpl,
        md:             getMarkdownTpl,
        markdown:       getMarkdownTpl,
        html:           getConstantTpl,
        php:            getConstantTpl,
    }

    for ( var k in fnMap ){
        if ( partMap[k] ){
            return fnMap[k]( component, partMap[k], exports, constants );
        }
    }

    return Error.bind( Error, "Component " + component.path + " has no template parts." );
}///


function getConstantTpl( component, code ){

    return _.constant( code );
}///


function getMarkdownTpl( component, code, exports, constants ){

    try {
        return getConstantTpl( component, marked( code ));
    } catch( err ){
        console.error( "Template Syntax Error:", err, "in", component.path );
        console.error( code );
        throw( err );
    }
}///


function getCompiledTpl( compiler ){
    return function( component, code, exports, constants ){

        var fn;
        try {
            fn =            compiler( code );
            return runFn;
        } catch( err ){
            console.error( "Template Syntax Error:", err, "in", component.path );
            console.error( code );
            throw( err );
        }

        function runFn( args ){

            try {
                return fn( _.extend( exports, args, constants ));
            } catch( err ){
                console.error( "Template Execution Error:", err, "in", component.path );
                console.error( code );
            } 
        }///
    };//
}///


function getJadeReactTpl( component, code, exports, constants ){

    var render;
    var reactClass;

    try {
        render =                    reactJade.compile( code ).locals( constants );
        reactClass =                react.createClass({
            render:                 render,
            getDefaultProps:        extractReactTemplates.bind( this, exports ),
            getInitialState:        getInitialState,
        });
        template.jadeReactClass =   reactClass;
        return template;
    } catch( err ){
        console.error( "Template Syntax Error:", err, "in", component.path );
        console.error( code );
        throw( err );
    }

    function template( args ){

        try {
            return react.renderToString(
                react.createElement(
                    reactClass,
                    args ));
        } catch( err ){
            console.error( "Template Execution Error:", err, "in", component.path );
            console.error( code );
        }
    }///

    function extractReactTemplates( obj ){

        for( var k in obj ){
            obj[k] =    obj[k] && obj[k].jadeReactClass || obj[k];
        }

        return obj;
    }///

    function getInitialState(){

        return exports.yaml && exports.yaml.initialState || {};
    }///
}///
