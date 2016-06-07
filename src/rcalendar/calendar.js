angular.module( 'ui.rCalendar', [] );
angular.module( 'ui.rCalendar' )
       .constant( 'calendarConfig', {
           formatDay: 'dd',
           formatDayHeader: 'EEE',
           formatDayTitle: 'MMMM dd, yyyy',
           formatMonthTitle: 'MMMM yyyy',
           formatHourColumn: 'dd \'de\' MMMM, HH:mm',
           startingDay: 0,
           eventSource: null,
           queryMode: 'local'
       } );

angular.module( 'ui.rCalendar' )
       .directive( 'calendar', function calendarDirective() {
           'use strict';
           return {
               restrict: 'EA',
               replace: true,
               templateUrl: 'template/rcalendar/calendar.html',
               bindToController: true,
               controllerAs: 'vm',
               scope: {
                   viewRefreshed: '&',
                   eventSelected: '&',
                   timeSelected: '&',
                   showEventList: '=',
                   showEventPins: '='
               },
               require: [ 'calendar', '?^ngModel' ],
               controller: 'ui.rCalendar.CalendarController',
               link: function( scope, element, attrs, ctrls ) {
                   var vm = ctrls[ 0 ];
                   var ngModelCtrl = ctrls[ 1 ];

                   if ( ngModelCtrl ) {
                       vm.init( ngModelCtrl );
                   }

                   scope.$on( 'changeDate', function( event, direction ) {
                       vm.move( direction );
                   } );

                   scope.$on( 'eventSourceChanged', function( event, value ) {
                       vm.onEventSourceChanged( value );
                   } );
               }
           };
       } );

angular.module( 'ui.rCalendar' ).directive( 'monthview', function monthDirective() {
    'use strict';
    return {
        restrict: 'EA',
        replace: true,
        templateUrl: 'template/rcalendar/month.html'
    };
} );

angular.module( 'ui.rCalendar' )
       .controller( 'ui.rCalendar.CalendarController', CalendarController );

CalendarController.$inject = [
    '$scope', '$attrs', '$interpolate', '$log', '$mdMedia', 'dateFilter', 'calendarConfig'
];

/**
 * Calendar directive controller
 *
 * @param {Object} $scope -  angular $scope service
 * @param {Object} $attrs -  angular $attrs service
 * @param {Object} $interpolate -  angular $interpolate service
 * @param {Object} $log -  angular $log service
 * @param {Object} $mdMedia -  angular-material $mdMedia service
 * @param {Object} dateFilter -  angular dateFilter filter
 * @param {Object} calendarConfig -  calendar config
 * @constructor
 */
function CalendarController( $scope, $attrs, $interpolate, $log, $mdMedia, dateFilter, calendarConfig ) {
    'use strict';
    var vm = this;
    var ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl;

    // Configuration attributes
    angular.forEach( [
        'formatDay',
        'formatDayHeader',
        'formatDayTitle',
        'formatMonthTitle',
        'formatHourColumn',
        'startingDay',
        'eventSource',
        'queryMode'
    ], function( key, index ) {
        vm[ key ] = angular.isDefined( $attrs[ key ] ) ? ( index < 7 ? $interpolate( $attrs[ key ] )( $scope.$parent ) : $scope.$parent.$eval( $attrs[ key ] ) ) : calendarConfig[ key ];
    } );

    $scope.$parent.$watch( $attrs.eventSource, function( value ) {
        vm.onEventSourceChanged( value );
    } );

    vm.$mdMedia = $mdMedia;

    /**
     * Initialize the calendar
     *
     * @param {Object} ngModelCtrl_ - angular ngModel directive controller
     *
     * @returns {void}
     */
    vm.init = function( ngModelCtrl_ ) {
        ngModelCtrl = ngModelCtrl_;
        ngModelCtrl.$formatters.push( validateDate );

        /**
         * Copy model value to local scope and render the calendar
         *
         * @returns {void}
         */
        ngModelCtrl.$render = function() {
            vm._selectedDate = ngModelCtrl.$viewValue || new Date();
            refreshView();
        };
    };

    /**
     * Event triggered on event source changed
     *
     * @param {Object} eventSource - the new event source
     *
     * @returns {void}
     */
    vm.onEventSourceChanged = function( eventSource ) {
        vm.eventSource = eventSource;
        if ( onDataLoaded ) {
            onDataLoaded();
        }
    };

    /**
     * Change selected month
     *
     * @param {Number} step -
     *
     * @returns {void}
     */
    vm.moveMonth = function( step ) {
        var year = vm._selectedDate.getFullYear();
        var month = vm._selectedDate.getMonth() + step;
        var date = vm._selectedDate.getDate();
        var newDate = new Date( year, month, date );
        var firstDayInNextMonth = new Date( year, month + 1, 1 );

        if ( firstDayInNextMonth.getTime() <= newDate.getTime() ) {
            newDate = new Date( firstDayInNextMonth - 24 * 60 * 60 * 1000 );
        }

        vm._selectedDate = newDate;
        ngModelCtrl.$setViewValue( newDate );

        refreshView();
    };

    /**
     * Change selected day
     *
     * @param {Number} step -
     *
     * @returns {void}
     */
    vm.moveDay = function( step ) {
        var _selectedDate = vm._selectedDate;
        var year = _selectedDate.getFullYear();
        var month = _selectedDate.getMonth();
        var date = _selectedDate.getDate() + step;
        var newDate = new Date( year, month, date );

        vm._selectedDate = newDate;
        ngModelCtrl.$setViewValue( newDate );

        refreshView();
    };

    /**
     * Select a new date
     *
     * @param {Date} selectedDate - the choosen date
     *
     * @returns {void}
     */
    vm.select = function( selectedDate ) {
        var weeks = vm.weeks;
        var currentMonth;
        var currentYear;
        var selectedMonth;
        var selectedYear;
        var direction;
        var selected;
        var row;
        var date;

        if ( weeks ) {
            currentMonth = vm._selectedDate.getMonth();
            currentYear = vm._selectedDate.getFullYear();
            selectedMonth = selectedDate.getMonth();
            selectedYear = selectedDate.getFullYear();
            direction = 0;

            if ( currentYear === selectedYear ) {
                if ( currentMonth !== selectedMonth ) {
                    direction = currentMonth < selectedMonth ? 1 : -1;
                }
            } else {
                direction = currentYear < selectedYear ? 1 : -1;
            }

            vm._selectedDate = selectedDate;
            if ( ngModelCtrl ) {
                ngModelCtrl.$setViewValue( selectedDate );
            }
            if ( direction === 0 ) {
                for ( row = 0; row < 6; row += 1 ) {
                    for ( date = 0; date < 7; date += 1 ) {
                        selected = compare( selectedDate, weeks[ row ][ date ] ) === 0;
                        weeks[ row ][ date ].selected = selected;
                        if ( selected ) {
                            vm.selectedDate = weeks[ row ][ date ];
                        }
                    }
                }
            } else {
                refreshView();
            }

            if ( vm.timeSelected ) {
                vm.timeSelected( { selectedTime: selectedDate } );
            }
        }
    };

    vm.mode = {
        step: { months: 1 }
    };

    /////////////////////////////////////////////////////////////////////
    // Private members
    /////////////////////////////////////////////////////////////////////

    /**
     * Event called when view is refreshed and query mode is local (data is available locally).
     * Fills event data on every date and change the selected date.
     *
     * @returns {void}
     */
    function onDataLoaded() {
        var events = vm.eventSource;
        var len = events ? events.length : 0;
        var startTime = vm.range.startTime;
        var endTime = vm.range.endTime;
        var weeks = vm.weeks;
        var oneDay = 86400000;
        var eps = 0.001;
        var row;
        var date;
        var hasEvent = false;
        var findSelected = false;
        var st;
        var et;
        var eventSet;
        var rowIndex;
        var dayIndex;
        var i;
        var index;
        var timeDifferenceStart;
        var timeDifferenceEnd;
        var event;
        var eventStartTime;
        var eventEndTime;

        if ( weeks.hasEvent ) {
            for ( row = 0; row < 6; row += 1 ) {
                for ( date = 0; date < 7; date += 1 ) {
                    if ( weeks[ row ][ date ].hasEvent ) {
                        weeks[ row ][ date ].events = null;
                        weeks[ row ][ date ].hasEvent = false;
                    }
                }
            }
        }

        for ( i = 0; i < len; i += 1 ) {
            event = events[ i ];
            eventStartTime = new Date( event.startTime );
            eventEndTime = new Date( event.endTime );

            if ( eventEndTime <= startTime || eventStartTime >= endTime ) {
                continue;
            } else {
                st = startTime;
                et = endTime;
            }

            if ( eventStartTime <= st ) {
                timeDifferenceStart = 0;
            } else {
                timeDifferenceStart = ( eventStartTime - st ) / oneDay;
            }

            if ( eventEndTime >= et ) {
                timeDifferenceEnd = ( et - st ) / oneDay;
            } else {
                timeDifferenceEnd = ( eventEndTime - st ) / oneDay;
            }

            index = Math.floor( timeDifferenceStart );

            while ( index < timeDifferenceEnd - eps ) {
                rowIndex = Math.floor( index / 7 );
                dayIndex = Math.floor( index % 7 );
                weeks[ rowIndex ][ dayIndex ].hasEvent = true;
                eventSet = weeks[ rowIndex ][ dayIndex ].events;
                if ( eventSet ) {
                    eventSet.push( event );
                } else {
                    eventSet = [];
                    eventSet.push( event );
                    weeks[ rowIndex ][ dayIndex ].events = eventSet;
                }
                index += 1;
            }
        }

        for ( row = 0; row < 6; row += 1 ) {
            for ( date = 0; date < 7; date += 1 ) {
                if ( weeks[ row ][ date ].hasEvent ) {
                    hasEvent = true;
                    weeks[ row ][ date ].events.sort( compareEvent );
                }
            }
        }
        weeks.hasEvent = hasEvent;

        for ( row = 0; row < 6; row += 1 ) {
            for ( date = 0; date < 7; date += 1 ) {
                if ( weeks[ row ][ date ].selected ) {
                    vm.selectedDate = weeks[ row ][ date ];
                    findSelected = true;
                    break;
                }
            }
            if ( findSelected ) {
                break;
            }
        }
    }

    /**
     * Event called when view is refreshed.
     *
     * @returns {void}
     */
    function onViewRefreshed() {
        if ( vm.queryMode === 'local' ) {
            if ( vm.eventSource && onDataLoaded ) {
                onDataLoaded();
            }
        } else if ( vm.queryMode === 'remote' ) {
            if ( vm.viewRefreshed ) {
                vm.viewRefreshed( {
                    selectedDate: vm._selectedDate,
                    range: vm.range
                } );
            }
        }
    }

    /**
     * Attach metadata to each date.
     *
     * @param {Array} days - javascript date array
     * @param {Number} month - day's month
     *
     * @returns {void}
     */
    function attachDaysMetadata( days, month ) {
        var i;
        for ( i = 0; i < 42; i++ ) {
            angular.extend( days[ i ], createDayMetadata( days[ i ] ), {
                secondary: days[ i ].getMonth() !== month
            } );
        }
    }

    /**
     * Create day metadata used by view
     *
     * @param {Date} day - javascript date
     * @returns {{label: *, headerLabel: *, selected: boolean, current: boolean}} - day metadata
     */
    function createDayMetadata( day ) {
        return {
            label: dateFilter( day, vm.formatDay ),
            headerLabel: dateFilter( day, vm.formatDayHeader ),
            selected: compare( day, vm._selectedDate ) === 0,
            current: compare( day, new Date() ) === 0
        };
    }

    /**
     * Create labels for calendar days header
     *
     * @param {Array} days - javascript date array
     * @returns {Array<String>} - array with days names
     */
    function createDaysLabels( days ) {
        var labels = new Array( 7 );
        var j;
        for ( j = 0; j < 7; j++ ) {
            labels[ j ] = dateFilter( days[ j ], vm.formatDayHeader );
        }
        return labels;
    }

    /**
     * Generates n sequential dates from 'startDate'
     *
     * @param {Date} startDate - the start date
     * @param {Number} n - number de dates to generate from 'startDate'
     * @returns {Array} - The generated dates
     */
    function generateNDaysFrom( startDate, n ) {
        var days = new Array( n );
        var current = new Date( startDate );
        var i = 0;

        current.setHours( 12 ); // Prevent repeated dates because of timezone bug

        while ( i < n ) {
            days[ i++ ] = new Date( current );
            current.setDate( current.getDate() + 1 );
        }
        return days;
    }

    /**
     * Validate model date
     *
     * @param {Object} $viewValue - angular $viewMode
     * @returns {Object} - returns $viewValue if it is a valida date, or null otherwise
     */
    function validateDate( $viewValue ) {
        var date = new Date( $viewValue );
        var isValid = !isNaN( date );

        if ( !isValid ) {
            $log.error( '"ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.' );
            $log.info( 'using current date as ngModel' );
        }

        ngModelCtrl.$setValidity( 'date', isValid );
        return isValid ? $viewValue : null;
    }

    /**
     * Compare 2 dates
     *
     * @param {Date} date1 - javascript date
     * @param {Date} date2 - javascript date
     *
     * @returns {number} - 0 if date are equal. Otherwise, returns a number different from 0
     */
    function compare( date1, date2 ) {
        return ( new Date( date1.getFullYear(), date1.getMonth(), date1.getDate() ) - new Date( date2.getFullYear(), date2.getMonth(), date2.getDate() ) );
    }

    /**
     * Compare two events. Two events are equal if its startTime are equal
     *
     * @param {Object} event1 - event
     * @param {Object} event2 - event
     *
     * @returns {number} - 0 if events are equal. Other number if are not equal
     */
    function compareEvent( event1, event2 ) {
        return ( event1.startTime.getTime() - event2.startTime.getTime() );
    }

    /**
     * Update local scope causing view refresh. Re-render calendar.
     *
     * @returns {void}
     */
    function refreshView() {
        var startDate;
        var day;
        var month;
        var year;
        var headerDate;
        var days;

        if ( vm.mode ) {

            vm.range = getRange( vm._selectedDate );

            startDate = vm.range.startTime;
            day = startDate.getDate();
            month = ( startDate.getMonth() + ( day !== 1 ? 1 : 0 ) ) % 12;
            year = startDate.getFullYear() + ( day !== 1 && month === 0 ? 1 : 0 );
            headerDate = new Date( year, month, 1 );
            days = generateNDaysFrom( startDate, 42 );

            attachDaysMetadata( days, month );

            vm.labels = createDaysLabels( days );
            vm.title = dateFilter( headerDate, vm.formatMonthTitle );
            vm.weeks = split( days, 7 );

            onViewRefreshed();
        }
    }

    /**
     * Split array into smaller arrays
     *
     * @param {Array} arr - array to split
     * @param {Number} size - length of resulting arrays
     *
     * @returns {Array} - Array of arrays
     */
    function split( arr, size ) {
        var arrays = [];
        while ( arr.length > 0 ) {
            arrays.push( arr.splice( 0, size ) );
        }
        return arrays;
    }

    /**
     * Generate calendar date range from current date
     *
     * @param {Date} currentDate - current date
     *
     * @returns {{startTime: Date, endTime: Date}} - date range
     */
    function getRange( currentDate ) {
        var year = currentDate.getFullYear();
        var month = currentDate.getMonth();
        var firstDayOfMonth = new Date( year, month, 1 );
        var difference = vm.startingDay - firstDayOfMonth.getDay();
        var numDisplayedFromPreviousMonth = ( difference > 0 ) ? 7 - difference : -difference;
        var startDate = new Date( firstDayOfMonth );
        var endDate;

        if ( numDisplayedFromPreviousMonth > 0 ) {
            startDate.setDate( -numDisplayedFromPreviousMonth + 1 );
        }

        endDate = new Date( startDate );
        endDate.setDate( endDate.getDate() + 42 );

        return {
            startTime: startDate,
            endTime: endDate
        };
    }
}
