angular.module( 'calendarDemoApp', [ 'ui.rCalendar', 'ngMaterial', 'sticky' ] );

angular.module( 'calendarDemoApp' ).run( [
    '$rootScope', '$mdMedia', function( $rootScope, $mdMedia ) {
        'use strict';
        $rootScope.$mdMedia = $mdMedia;
    }
] );

angular.module( 'calendarDemoApp' ).config( [
    '$mdThemingProvider', function( $mdThemingProvider ) {
        'use strict';

        var customPrimary = {
            '50': '#67c7e2',
            '100': '#52bfde',
            '200': '#3cb7da',
            '300': '#28aed5',
            '400': '#249dbf',
            '500': '#208BAA',
            '600': '#1c7994',
            '700': '#18687f',
            '800': '#14566a',
            '900': '#104554',
            'A100': '#7dcfe6',
            'A200': '#92d7ea',
            'A400': '#a7dfef',
            'A700': '#0c333f',
            'contrastDefaultColor': 'light'
        };
        var customAccent = {
            '50': '#6e2731',
            '100': '#802e39',
            '200': '#933541',
            '300': '#a63c4a',
            '400': '#b94252',
            '500': '#c15362',
            '600': '#cf7984',
            '700': '#d58b95',
            '800': '#dc9ea6',
            '900': '#e3b1b8',
            'A100': '#cf7984',
            'A200': '#C86673',
            'A400': '#c15362',
            'A700': '#eac4c9',
            'contrastDefaultColor': 'light'
        };

        var customWarn = {
            '50': '#ffb280',
            '100': '#ffa266',
            '200': '#ff934d',
            '300': '#ff8333',
            '400': '#ff741a',
            '500': '#ff6400',
            '600': '#e65a00',
            '700': '#cc5000',
            '800': '#b34600',
            '900': '#993c00',
            'A100': '#ffc199',
            'A200': '#ffd1b3',
            'A400': '#ffe0cc',
            'A700': '#803200'
        };

        var customBackground = {
            '50': '#737373',
            '100': '#666666',
            '200': '#595959',
            '300': '#4d4d4d',
            '400': '#404040',
            '500': '#333',
            '600': '#262626',
            '700': '#1a1a1a',
            '800': '#0d0d0d',
            '900': '#000000',
            'A100': '#808080',
            'A200': '#8c8c8c',
            'A400': '#999999',
            'A700': '#000000'
        };

        $mdThemingProvider
            .definePalette( 'customAccent', customAccent );
        $mdThemingProvider
            .definePalette( 'customPrimary', customPrimary );
        $mdThemingProvider
            .definePalette( 'customWarn', customWarn );
        $mdThemingProvider
            .definePalette( 'customBackground', customBackground );

        /*
         Primary and warn palettes
         md-primary': '500';
         md-hue-1': '300';
         md-hue-2': '800';
         md-hue-3': 'A100';
         */

        /*
         Accent palette
         md-primary': 'A200';
         md-hue-1': 'A100';
         md-hue-2': 'A400';
         md-hue-3': 'A700';
         */

        $mdThemingProvider
            .theme( 'espm' )
            .primaryPalette( 'customPrimary' )
            .accentPalette( 'customAccent' )
            .warnPalette( 'customWarn' );

        $mdThemingProvider.setDefaultTheme( 'espm' );
    }
] );

angular.module( 'calendarDemoApp' ).controller( 'CalendarDemoCtrl', [
    '$scope', function( $scope ) {
        'use strict';

        $scope.changeMode = function( mode ) {
            $scope.mode = mode;
        };

        $scope.today = function() {
            $scope.currentDate = new Date();
        };

        $scope.isToday = function() {
            var today = new Date(), currentCalendarDate = new Date( $scope.currentDate );

            today.setHours( 0, 0, 0, 0 );
            currentCalendarDate.setHours( 0, 0, 0, 0 );
            return today.getTime() === currentCalendarDate.getTime();
        };

        $scope.loadEvents = function() {
            $scope.eventSource = createRandomEvents();
        };

        $scope.onEventSelected = function( event ) {
            $scope.event = event;
        };

        $scope.onTimeSelected = function( selectedTime ) {
            console.log( 'Selected time: ' + selectedTime );
        };


        var colors = [
            '#EF5350', '#EC407A', '#AB47BC', '#29B6F6', '#7CB342', '#66BB6A', '#FFCA28', '#FF7043'
        ];

        /*var colors = [
            '#F44336', '#EC407A', '#1565C0', '#00695C', '#AFB42B', '#FFC400', '#6D4C41'
        ];*/
        /*var colors = [
            '#F44336', '#EC407A', '#1565C0', '#00695C', '#AFB42B', '#FFC400', '#6D4C41'
        ];*/

        /*var colors = [
         '#F44336',  '#00695C', '#6D4C41'
         ];
         */
        /*var colors = [
         '#C86673', '#cf7984', '#c15362', '#eac4c9'
         ];*/

        /*var colors = [
         '#C86673','#ff8333','#18687f'
         ];*/

        /* var colors = [
         '#C86673','#18687f'
         ];*/
        function createRandomEvents() {
            var events = [];
            for ( var i = 0; i < 550; i += 1 ) {
                var date = new Date();
                var startDay = Math.floor( Math.random() * 90 ) - 25;
                var endDay = Math.floor( Math.random() * 3 ) + startDay;
                var color = colors[ Math.floor( Math.random() * ( (colors.length - 1) - 0 + 1) ) ];
                var startTime;
                var endTime;
                var startMinute = Math.floor( Math.random() * 24 * 60 );
                var endMinute = Math.floor( Math.random() * 180 ) + startMinute;

                startTime = new Date( date.getFullYear(), date.getMonth(), date.getDate() + startDay, 0, date.getMinutes() + startMinute );
                endTime = new Date( date.getFullYear(), date.getMonth(), date.getDate() + endDay, 0, date.getMinutes() + endMinute );
                events.push( {
                    title: 'Event - ' + i,
                    description: 'Long story short, though, its much improved by using dedicated click handlers, setting a ngModel if desired, taking all kinds of labels',
                    startTime: startTime,
                    endTime: endTime,
                    allDay: false,
                    color: color
                } );
                //}
            }
            return events;
        }
    }
] );