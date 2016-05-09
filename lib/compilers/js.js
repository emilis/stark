/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var fs =                require( "fs" );
var jade =              require( "jade" );
var livescript =        require( "livescript" );
var mpc =               require( "mpc" );
var reactJade =         require( "react-jade" );
var resolve =           require( "resolve" );

/// Constants ------------------------------------------------------------------

var JSNAMESPACE =       "window.Modules";

var _REACTCLASS =       "_reactClass";
var _REACTSPEC =        "reactSpec";
var _TEMPLATE =         "_template";

var JADEPART =          "jade";
var JREACTPART =        "jade-react";
var REACTSPECPART =     "react-spec";
var REACTLSPART =       "react-spec-ls";

var JADERUNTIME =       __dirname + "/../thirdparty/jade-runtime.js";
var REACTJS =           resolve.sync( "react/dist/react-with-addons.min.js", { basename: __dirname });

var PARTNAMES =         [ "exports", "js", "ls", "livescript", JREACTPART, REACTSPECPART, REACTLSPART ];

/// Exports --------------------------------------------------------------------

module.exports = {
    partNames:          PARTNAMES,
    compileComponents:  compileComponents,
    getJsModule:        getJsModule,
};

/// functions ------------------------------------------------------------------

function compileComponents( config, components ){

    var options =       config && config.compiler && config.compiler.js || {};
    options.nowrap =    options.nowrap || [];

    var prefix =        [ ";" + JSNAMESPACE + "={};" ];

    if( components.some( hasJadePart )){
        prefix.push( fs.readFileSync( JADERUNTIME, "utf8" ));
    }
    if( components.some( hasJadeReactPart )){
        prefix.push( fs.readFileSync( REACTJS, "utf8" ));
    }

    var modules =       components.map( getCode );
    
    return prefix.concat( modules ).join( "\n" );

    function getCode( component ){

        if( options.nowrap.indexOf( component.path ) !== -1 ){
            if ( component.partMap.js ){
                return ";\n" + component.partMap.js + ";\n";
            } else {
                return "";
            }
        } else {
            return getJsModule( component );
        }
    }///
}///


function getJsModule( component ){

    var HAS_EXPORTS =   component.partMap.exports;
    var HAS_JS =        component.partMap.js;
    var HAS_LS =        component.partMap.ls || component.partMap.livescript;
    var HAS_JADE =      hasJadeContent( component );
    var HAS_JREACT =    hasJadeReactContent( component );
    var HAS_REACTSPEC = hasReactSpecContent( component );
    var HAS_REACTLS =   hasReactLsContent( component );
    var HAS_ANY_JADE =  HAS_JADE || HAS_JREACT;
    var HAS_ANY_REACT = HAS_JREACT || HAS_REACTSPEC || HAS_REACTLS;
    var HAS_ANY_JS =    HAS_EXPORTS || HAS_JS || HAS_LS || HAS_JREACT || HAS_REACTSPEC || HAS_REACTLS;

    var constants = {
        PATH:           component.path,
        CLASSNAME:      component.className,
        SELECTOR:       component.selector,
    };

    var internalVars =  _.extend(
        {
            yaml:       component.yaml,
            jst:        component.partMap.jst
        },
        component.yaml,
        constants,
        {   exports:    {} });

    var exports =       _.extend( {}, component.exports );
    if( HAS_ANY_JADE ){
        exports[ _TEMPLATE ] =      _TEMPLATE;
    }

    var code =          [];

    if ( HAS_ANY_JS ){
        
        /// Module open:
        code.push(
            ";// Module ", component.path, " ---\n",
            "(function(",
                mapObj( component.requirements, getVarName ).join( "," ),
            "){\n",
                /// Internal variables (YAML + constants + ...)
                mapObj( internalVars, getVarLine ).join( "\n" ), "\n",

                /// Template definitions:
                HAS_JADE
                    ? createJadeVars( component )
                    : "",
                HAS_ANY_REACT
                    ? createReactVars( component, constants, internalVars, HAS_JADE )
                    : "",
                
                /// JS part code:
                ";\n",
                component.parts.map( getCode ).join( ";\n;" ),
                ";\n"
        );

        /// Exports:
        code.push(
            mapObj( exports, getExportLine ).join( "\n" ), "\n"
        );

        if( HAS_ANY_JADE ){
            code.push(
                reexportLines( exports, _TEMPLATE ).join( "\n" ), "\n"
            );
        }
        if( HAS_ANY_REACT ){
            code.push( exportReactClass( exports ));
        }

        code.push(
            JSNAMESPACE, "[\"", component.path, "\"] = exports;\n"
        );

        /// Imports:
        code.push(
            "})( ",
                mapObj( component.requirements, getArgumentLine ).join( ", " ),
            " );\n"
        );
    }
    
    return code.join( "" );
}///

/// Private functions ----------------------------------------------------------

function getCode( part ){

    switch( part.partName ){

        case "js":
            return part.content;
            break;

        case "ls":
        case "livescript":
            return livescript.compile( part.content, { bare: true });
            break;

        case REACTSPECPART:
            return getReactSpecCode( part.content );
            break;

        case REACTLSPART:
            return livescript.compile( getReactLsCode( part.content ), { bare: true });
            break;

        default:
            return "";
    }
}///

function getVarName( v, k ){

    return k.replace( /[^0-9a-z]+/ig, "_" ).replace( /_+/g, "_" );
}///

function getVarLine( v, k ){

    return "var " + k + " = " + JSON.stringify( v ) + ";";
}///

function getExportLine( v, k ){

    return "exports." + k + "= " + v + ";";
}///

function getKeyVar( v, k ){

    var varName =   getVarName( v, k );
    return varName + ":" + varName;
}///

function getArgumentLine( v ){

    return JSNAMESPACE + '["' + v.path + '"]';
}///

function reexportLines( exports, varName ){

    return mapObj( exports, appendToVar );

    function appendToVar( v, k ){

        if( k === varName ){
            return "";
        } else {
            return "exports." + varName + "." + k + "= " + v + ";";
        }
    }///
}///

function getTemplateExport( v, k ){

    var name =      getVarName( v, k );
    return name + "&&" + name + "." + _TEMPLATE + "||" + name;
}///


/// Jade template --------------------------------------------------------------

function hasJadePart( component ){

    return JADEPART in component.partMap;
}///

function hasJadeContent( component ){

    return !!component.partMap[ JADEPART ];
}///

function createJadeVars( component ){

    return [
        "var ", _TEMPLATE, " = ",
        "(function(", 
            mapObj( component.requirements, getVarName ).join( "," ),
        "){\nreturn ",
            jade.compileClient( component.partMap[ JADEPART ] ),
        ";\n})(",
            mapObj( component.requirements, getTemplateExport ).join( "," ),
        ");\n"
    ].join( "" );
}///


/// Jade-React templates -------------------------------------------------------

function hasJadeReactPart( component ){

    return JREACTPART in component.partMap;
}///

function hasJadeReactContent( component ){

    return !!component.partMap[ JREACTPART ];
}///

function createJadeReactRender( component, constants ){

    try {
        var render =    reactJade.compileClient( component.partMap[ JREACTPART ], { globalReact: true });
    } catch( err ){
        console.error( "JS Template compilation error:", err, "\nComponent:", component.mpcComponent.name, "\n", component.partMap[JREACTPART] );
        throw err;
    }

    return render + ".locals({" + mapObj( constants, getKeyVar ).join( "," ) + "})";
}///


/// React setup and export -----------------------------------------------------

function createReactVars( component, constants, internalVars, skipTemplate ){

    return [
        "var ", _REACTSPEC, " = {\n",
            "displayName: ", JSON.stringify( constants.PATH ), ",\n",
            component.partMap[ JREACTPART ]
                ? ( "render: " + createJadeReactRender( component, constants ) +",\n" )
                : "",
            "getDefaultProps: function(){ return {\n",
                [].concat(
                    mapObj( component.requirements, getRequirementProp ),
                    mapObj( internalVars, getKeyVar )
                ).join( ",\n" ),
            "};\n}",
        "};",
        skipTemplate
            ? ""
            : "var " + _TEMPLATE + " = function( props ){ return React.renderToString( React.createElement( " + _REACTSPEC + ", props)); };\n",
    ].join( "" );

    function getRequirementProp( v, k ){

        var vn =    getVarName( v, k );

        return vn + ": " + vn + "&&" + vn + "." + _REACTCLASS + "||" + getTemplateExport( v, k );
    }///
}///

function exportReactClass( exports ){

    var specFields = [
        "propTypes",
        "mixins",
        "componentWillMount",
        "componentDidMount",
        "componentWillReceiveProps",
        "shouldComponentUpdate",
        "componentWillUpdate",
        "componentDidUpdate",
        "componentWillUnmount",
    ];

    return [
        /// Make exports accessible in other jade-react templates:
        _REACTSPEC, ".statics = ", _REACTSPEC, ".statics || exports;",
        "\n",

        /// Use getInitialState if defined or use yaml.initialState:
        "var getInitialState,initialState;",
        "\n",
        _REACTSPEC, ".getInitialState = ",
            _REACTSPEC, ".getInitialState ",
            "|| getInitialState ",
            "|| ( initialState ? function(){ return initialState; } : undefined );",
        "\n",

        /// Use React component spec and lifecycle methods if defined:
        "var ", specFields.join( "," ), ";",
        "\n",
        specFields.map( grabVar ).join( "\n" ),
        "\n",

        /// Create a ReactClass:
        "exports.", _REACTCLASS, "= React.createClass(", _REACTSPEC, ");",
        "\n",
    ].join( "" );

    function grabVar( name ){

        return [
            _REACTSPEC, ".", name, "=", _REACTSPEC, ".", name, "||", name, ";",
        ].join( "" );
    }///
}///


/// React spec part ------------------------------------------------------------

function hasReactSpecContent( component ){

    return !!component.partMap[ REACTSPECPART ];
}///

function getReactSpecCode( code ){

    return "\n;(function(a,b){for(var k in b){a[k]=b[k];}})(" + _REACTSPEC + ",{" + code + "});\n";
}///

function hasReactLsContent( component ){

    return !!component.partMap[ REACTLSPART ];
}///

function getReactLsCode( code ){

    return _REACTSPEC + "<<< {\n" + code + "}\n";
}///


/// Utilities ------------------------------------------------------------------

function keys( o ){
    return o && Object.getOwnPropertyNames( o ) || [];
}///

function mapObj( o, fn ){

    return keys( o ).map( callFn );

    function callFn( k ){
        return fn( o[k], k, o );
    }///
}///


