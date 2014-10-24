/** Copyright ------------------------------------------------------------------

    Copyright 2014 Emilis Dambauskas <emilis.d@gmail.com>.

    This file is part of Stark.js.

    Stark.js is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Stark.js is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Stark.js.  If not, see <http://www.gnu.org/licenses/>.
**/
/// Requirements ---------------------------------------------------------------

var fs =            require( "fs" );
var http =          require( "http" );
var mkdirp =        require( "mkdirp" );
var ncp =           require( "ncp" );
var net =           require( "net" );
var os =            require( "os" );
var path =          require( "path" );
var stark =         require( "../stark" );
var static =        require( "node-static" );
var yargs =         require( "yargs" );

/// Constants ------------------------------------------------------------------

var SERVER_PORT =   7780;   /// "JS"

/// Variables ------------------------------------------------------------------

var docsDir =       __dirname + "/../docs";
var exampleDir =    __dirname + "/../example";

/// Exports --------------------------------------------------------------------

module.exports = {
    main:           main,
};

/// Functions ------------------------------------------------------------------

function main(){

    var dir =       process.cwd();
    var argv =      yargs
                    .boolean( "h" ).alias( "h", "help" )
                    .boolean( "v" ).alias( "v", "version" )
                    .alias( "s", "source" ).default( "s", dir )
                    .alias( "d", "destination" ).default( "d", dir + "/build" )
                    .argv;

    var command =   argv._ && argv._.length && argv._[0] || null;
    var srcDir =    path.resolve( argv.source );
    var destDir =   path.resolve( argv.destination );

    if ( argv.version ){
        return printAndExitOk( getVersion() );
    }

    if ( argv.help ){
        return printAndExitOk( getHelp() );
    }

    switch( command ){

        case "build":
            compile( srcDir, destDir );
            break;

        case "new":
        case "create":
            copyExample( exampleDir, argv._[1] );
            break;

        case "serve":
        case "server":
            compile( srcDir, destDir );
            serveDirectory( destDir );
            break;

        case "docs":
            var tmpDir =    os.tmpdir() + "/stark-docs";
            compile( docsDir, tmpDir );
            serveDirectory( tmpDir );
            break;

        case null:
            console.error( getHelp() );
            break;

        default:
            console.error( "Unknown command '" + command + "'.\n" );
            console.error( getHelp() );
    }
}///

function compile( src, dest ){

    var index =     src + "/index";

    mkdirp.sync( dest );

    stark.compileCss(   index,  dest + "/style.css" );
    stark.compileJs(    index,  dest + "/script.js" );
    stark.compileSite(  src,    dest );

    if ( fs.existsSync( src + "/static" )){
        ncp.ncp( 
            src + "/static",
            dest + "/static"
        );
    }
}///


function copyExample( src, dest ){

    if ( dest ){
        if ( fs.existsSync( dest )){
            console.error( "Error:", dest, "already exists." );
        } else {
            ncp( src, dest );
            console.log( "New Stark site installed in", path.resolve( dest ), "." );
        }
    } else {
        console.error( "Usage: stark new PATH");
        console.error( "Error: You must specify a path for the new site." );
    }
}///


function serveDirectory( dir ){

    var portrange =     SERVER_PORT;

    getPort( onPort );

    function onPort( port ){

        var server =        new static.Server( dir );

        http.createServer( onRequest ).listen( port );

        console.log( "" );
        console.log( "Server running at: http://localhost:" + port );
        console.log( "Press Ctrl+C to stop." );

        function onRequest( request, response ){

            request.addListener( "end", onRequestEnd ).resume();

            function onRequestEnd(){

                server.serve( request, response );
            }///
        }///
    }

    function getPort( cb ){

        var port =      portrange++;
        var server =    net.createServer();

        server.listen( port, onListen );
        server.on( "error", getPort.bind( this, cb ));
        
        function onListen( err ){

            server.once( "close", cb.bind( this, port ));
            server.close();
        }///
    }///
}///

function printAndExitOk( text ){

    console.log( text );
    process.exit();
}///

function printAndExitError( text, status ){
    status =            status || 1;

    console.error( text );
    process.exit( status );
}///

function getHelp(){

    var str = [
        "Usage: stark COMMAND [OPTIONS]",
        "",
        "Commands:",
        "",
        "    build                  Compile the code into build/.",
        "    docs                   Start a web server with the documentation.",
        "    new PATH               Create a new site at PATH.",
        "    serve                  Compile and start a web server for build/.",
        "",
        "Options:",
        "",
        "    -s / --source          Source directory (defaults to ./).",
        "    -d / --destination     Destination directory (defaults to ./build/).",
        "    -h / --help            Print this help message.",
        "    -v / --version         Print version information.",
        "",
        ];

    return str.join( "\n" );
}///


function getVersion(){

    var package =   JSON.parse( fs.readFileSync( __dirname + "/package.json" ));

    var str = [
        package.description + " " + package.version,
        "Copyright (C) 2014 Emilis Dambauskas.",
        "",
        "This program is free software; you can redistribute it and/or modify",
        "it under the terms of the GNU General Public License as published by",
        "the Free Software Foundation; either version 3 of the License, or",
        "(at your option) any later version.",
        "",
        "This program is distributed in the hope that it will be useful,",
        "but WITHOUT ANY WARRANTY; without even the implied warranty of",
        "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the",
        "GNU General Public License for more details.",
        "",
        "You should have received a copy of the GNU General Public License",
        "along with this program. If not, see http://www.gnu.org/licenses/.",
        ];

    return str.join( "\n" );
}///
