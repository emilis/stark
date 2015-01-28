/// Requirements ---------------------------------------------------------------

var _ =                 require( "lodash" );
var fs =                require( "fs" );
var jade =              require( "jade" );
var mpc =               require( "mpc" );
var reactJade =         require( "react-jade" );

/// Constants ------------------------------------------------------------------

var JSNAMESPACE =       "window.Modules";

var _REACTRENDER =      "_reactRender";
var _REACTCLASS =       "_reactClass";
var _TEMPLATE =         "_template";

var JADEPART =          "jade";
var JREACTPART =        "jade-react";

var JADERUNTIME =       __dirname + "/../thirdparty/jade-runtime.js";
var REACTJS =           __dirname + "/../thirdparty/react-with-addons.js";

var PARTNAMES =         [ "js", JREACTPART ];

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

    if( components.some( hasJade )){
        prefix.push( fs.readFileSync( JADERUNTIME, "utf8" ));
    }
    if( components.some( hasJadeReact )){
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

    var HAS_JADE =      hasJade( component );
    var HAS_JREACT =    hasJadeReact( component );

    var content =       component.partMap.js;

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
    if( HAS_JADE || HAS_JREACT ){
        exports[ _TEMPLATE ] =      _TEMPLATE;
    }
    if( HAS_JREACT ){
        exports[ _REACTRENDER ] =   _REACTRENDER;
        exports[ _REACTCLASS ] =    _REACTCLASS;
    }

    var code =          [];

    if ( content || HAS_JREACT ){
        
        /// Module open:
        code.push(
            ";// Module ", component.path, " ---\n",
            "(function(",
                mapObj( component.requirements, getVarName ).join( "," ),
            "){\n",
                mapObj( internalVars, getVarLine ).join( "\n" ), "\n",
                createJadeVars( component ),
                createJadeReactVars( component, constants, internalVars, HAS_JADE ),
                content, ";\n"
        );
        
        /// Exports:
        code.push(
            mapObj( exports, getExportLine ).join( "\n" ), "\n"
        );

        if( HAS_JADE || HAS_JREACT ){
            code.push(
                reexportLines( exports, _TEMPLATE ).join( "\n" ), "\n"
            );
        }
        if( HAS_JREACT ){
            code.push(
                _REACTCLASS, ".statics = ", _REACTCLASS, ".statics || exports;",
                "\n",
                "exports.", _REACTCLASS, "= React.createClass(", _REACTCLASS, ");",
                "\n",
                reexportLines( exports, _REACTRENDER ).join( "\n" ),
                "\n"
            );
        }

        code.push(
            JSNAMESPACE, "[\"", component.path, "\"] = exports;\n"
        );

        /// Imports:
        code.push(
            '})( ',
                mapObj( component.requirements, getArgumentLine ).join( ", " ),
            " );\n"
        );
    }
    
    return code.join( "" );
}///

/// Private functions ----------------------------------------------------------

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

function hasJade( component ){

    return !!component.partMap[ JADEPART ];
}///

function createJadeVars( component ){

    if( !component.partMap[ JADEPART ]){
        return "";
    } else {

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
    }
}///

/// Jade-React templates -------------------------------------------------------

function hasJadeReact( component ){

    return !!component.partMap[ JREACTPART ];
}///


function createJadeReactVars( component, constants, internalVars, skipTemplate ){

    if( !component.partMap[ JREACTPART ]){
        return "";
    } else {
        return [

            "var ", _REACTRENDER, " = ",
            reactJade.compileClient( component.partMap[ JREACTPART ], { globalReact: true }),
                ".locals({ ",
                    mapObj( constants, getKeyVar ).join( "," ),
                "});",
            "var ", _REACTCLASS, " = {\n",
                "displayName: ", JSON.stringify( constants.PATH ), ",\n",
                "render: ", _REACTRENDER, ",\n",
                "getDefaultProps: function(){ return {\n",
                    mapObj( component.requirements, getRequirementProp ).concat(
                        mapObj( internalVars, getKeyVar )
                        ).join( ",\n" ),
                "};\n}",
            "};",
            ( skipTemplate ? "" : 
                "var " + _TEMPLATE + " = function( props ){ return React.renderToString( " + _REACTCLASS + "(props)); };\n"
              ),
        ].join( "" );
    }

    function getRequirementProp( v, k ){

        var vn =    getVarName( v, k );

        return vn + ": " + vn + "&&" + vn + "." + _REACTCLASS + "||" + getTemplateExport( v, k );
    }///
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


