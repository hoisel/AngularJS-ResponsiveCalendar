angular.module( 'calendarDemoApp', [ 'ui.rCalendar', 'ngMaterial', 'sticky' ] );

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

        function createRandomEvents() {
            var events = [];
            for ( var i = 0; i < 350; i += 1 ) {
                var date = new Date();
                var startDay = Math.floor( Math.random() * 90 ) - 25;
                var endDay = Math.floor( Math.random() * 3 ) + startDay;
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
                    allDay: false
                } );
                //}
            }
            return events;
        }
    }
] );