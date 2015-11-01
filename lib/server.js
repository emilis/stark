/** Copyright ------------------------------------------------------------------

    Copyright 2015 Emilis Dambauskas <emilis.d@gmail.com>.

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

var http =          require( "http" );
var net =           require( "net" );
var static =        require( "node-static" );


/// Constants ------------------------------------------------------------------

var SERVER_PORT =   7780;   /// "JS"


/// Exports --------------------------------------------------------------------

module.exports = serveDirectory;


/// Functions ------------------------------------------------------------------

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

        var port =      portrange;
        portrange++;

        var server =    net.createServer();
        server.on(      "error",    getPort.bind( this, cb ));
        server.once(    "close",    cb.bind( this, port ));
        server.listen(  port,       server.close.bind( server, null ))
    }///
}///
