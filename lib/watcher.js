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

var _ =             require( "lodash" );
var chokidar =      require( "chokidar" );
var path =          require( "path" );
var stark =         require( "../stark" );

/// Exports --------------------------------------------------------------------

module.exports = {
    watch:          watch,
};

/// Functions ------------------------------------------------------------------

function watch( srcDir, destDir ){

    var rebuild =       _.debounce( rebuildFn, 500 );

    var watcher =       chokidar.watch( srcDir, {
        ignored:        isIgnored,
        persistent:     true,
        ignoreInitial:  true,
    });

    console.log( "STARTING watcher. Kill process ( Ctrl+C ) to stop." );
    watcher.on( "all",  onChanges );

    rebuild();
    
    function rebuildFn(){

        console.log( (new Date).toISOString(), "REBUILDING" );
        stark.compileSite( srcDir, destDir );
    }///

    function onChanges( evtType, path ){
        /// console.log( "changed file", evtType, path );
        
        if( isIgnored( path )){
            return;
        }

        switch( evtType ){

        case "add":
        case "change":
        case "unlink":
        case "unlinkDir":
            
            console.log( (new Date).toISOString(), "FILES CHANGED: ", evtType, path );
            rebuild();
            break;
        }
    }///

    function isIgnored( path ){

        var result = ( false
            || ( path.slice( -4 ) === ".swp" )  /// Vim swap files
            || ( path.slice( -1 ) === "~" )     /// Emacs backup files
            || ( path.indexOf( "/.git/" ) !== -1 )
            || ( path.indexOf( "/node_modules/" ) !== -1 )
            || path.indexOf( srcDir )
            || !path.indexOf( destDir )
        );

        /// console.log( "isIgnored", path, result );
        return result;
    }///
}///
