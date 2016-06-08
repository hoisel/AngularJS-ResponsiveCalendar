angular.module( 'ui.rCalendar.tpls', ["template/rcalendar/calendar.html"]);
angular.module( 'ui.rCalendar', [ 'ui.rCalendar.tpls' ] );
angular.module( 'ui.rCalendar' )
       .constant( 'calendarConfig', {
           formatDay: 'dd',
           formatDayHeader: 'EEE',
           formatDayTitle: 'MMMM dd, yyyy',
           formatMonthTitle: 'MMMM yyyy',
           formatHourColumn: 'dd MMMM, HH:mm',
           startingDay: 0,
           eventSources: null,
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

angular.module( 'ui.rCalendar' )
       .controller( 'ui.rCalendar.CalendarController', CalendarController );

CalendarController.$inject = [
    '$scope',
    '$attrs',
    '$interpolate',
    '$log',
    '$mdMedia',
    '$mdColors',
    'dateFilter',
    'calendarConfig'
];

/**
 * Calendar directive controller
 *
 * @param {Object} $scope -  angular $scope service
 * @param {Object} $attrs -  angular $attrs service
 * @param {Object} $interpolate -  angular $interpolate service
 * @param {Object} $log -  angular $log service
 * @param {Object} $mdMedia -  angular-material $mdMedia service
 * @param {Object} $mdColors -  angular-material $mdColors service
 * @param {Object} dateFilter -  angular dateFilter filter
 * @param {Object} calendarConfig -  calendar config
 * @constructor
 */
function CalendarController( $scope, $attrs, $interpolate, $log, $mdMedia, $mdColors, dateFilter, calendarConfig ) {
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
        'eventSources',
        'queryMode'
    ], function( key, index ) {
        vm[ key ] = angular.isDefined( $attrs[ key ] ) ? ( index < 5 ? $interpolate( $attrs[ key ] )( $scope.$parent ) : $scope.$parent.$eval( $attrs[ key ] ) ) : calendarConfig[ key ];
    } );

    $scope.$parent.$watch( $attrs.eventSources, function( value ) {
        vm.onEventSourceChanged( value );
    } );

    vm.defaultEventColor = $mdColors.getThemeColor( 'accent' );
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
     * @param {Object} eventSources - the new event source
     *
     * @returns {void}
     */
    vm.onEventSourceChanged = function( eventSources ) {
        vm.eventSources = eventSources;
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
        var sources = vm.eventSources;
        var sourceLength = sources ? sources.length : 0;
        var source;
        var eventsLength;
        var startTime = vm.range.startTime;
        var endTime = vm.range.endTime;
        var weeks = vm.weeks;
        var oneDay = 86400000;
        var eps = 0.001;
        var week;
        var date;
        var day;
        var hasEvent = false;
        var eventSet;
        var rowIndex;
        var dayIndex;
        var i;
        var s;
        var index;
        var timeDifferenceStart;
        var timeDifferenceEnd;
        var event;
        var eventStartTime;
        var eventEndTime;

        // limpa eventos do mês
        if ( weeks.hasEvent ) {
            for ( week = 0; week < 6; week += 1 ) {
                for ( day = 0; day < 7; day += 1 ) {
                    date = weeks[ week ][ day ];
                    if ( date.hasEvent ) {
                        date.events = null;
                        date.hasEvent = false;
                    }
                }
            }
        }

        for ( s = 0; s < sourceLength; s += 1 ) {
            source = sources[ s ];
            eventsLength = ( source && source.items ) ? source.items.length : 0;

            for ( i = 0; i < eventsLength; i += 1 ) {
                event = source.items[ i ];
                eventStartTime = new Date( event.startTime );
                eventEndTime = new Date( event.endTime );

                // se evento termina antes do inicio do mes ou
                // começa depois do fim do mes, pula o evento
                if ( eventEndTime <= startTime || eventStartTime >= endTime ) {
                    continue;
                }

                // se o evento começa no mês anterior
                if ( eventStartTime <= startTime ) {
                    timeDifferenceStart = 0;
                } else {
                    timeDifferenceStart = ( eventStartTime - startTime ) / oneDay;
                }

                if ( eventEndTime >= endTime ) {
                    timeDifferenceEnd = ( endTime - startTime ) / oneDay;
                } else {
                    timeDifferenceEnd = ( eventEndTime - startTime ) / oneDay;
                }

                index = Math.floor( timeDifferenceStart );

                while ( index < timeDifferenceEnd - eps ) {
                    rowIndex = Math.floor( index / 7 );
                    dayIndex = Math.floor( index % 7 );
                    date = weeks[ rowIndex ][ dayIndex ];
                    date.hasEvent = true;

                    // add events
                    eventSet = date.events || [];
                    eventSet.push( event );
                    date.events = eventSet;

                    // add sources
                    date.sources = date.sources || {};
                    date.sources[ source.etag ] = date.sources[ source.etag ] || {
                        summary: source.summary,
                        color: source.color,
                        etag: source.etag
                    };

                    index += 1;
                }
            }

            for ( week = 0; week < 6; week += 1 ) {
                for ( day = 0; day < 7; day += 1 ) {
                    date = weeks[ week ][ day ];

                    if ( date.hasEvent ) {
                        hasEvent = true;
                        date.events.sort( compareEvent );
                    }

                    if ( date.selected ) {
                        vm.selectedDate = date;
                    }
                }
            }
            weeks.hasEvent = hasEvent;
        }
    }

    /**
     * Event called when view is refreshed.
     *
     * @returns {void}
     */
    function onViewRefreshed() {
        if ( vm.queryMode === 'local' ) {
            if ( vm.eventSources && onDataLoaded ) {
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

            vm.days = [].concat( days );
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

angular.module("template/rcalendar/calendar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rcalendar/calendar.html",
    "<div layout=\"column\" ng-cloak>\n" +
    "	<div class=\"month-view\">\n" +
    "		<div layout=\"column\" layout-gt-sm=\"row\">\n" +
    "			<div flex>\n" +
    "				<md-card\n" +
    "					id=\"calendar\"\n" +
    "					sticky\n" +
    "					offset=\"0\"\n" +
    "					media-query=\"min-width: 960px\"\n" +
    "					class=\"event-inner\"\n" +
    "					md-swipe-left='vm.moveMonth(1)'\n" +
    "					md-swipe-right='vm.moveMonth(-1)'>\n" +
    "					<md-card-header layout='row'\n" +
    "									layout-align=\"space-between center\"\n" +
    "									sticky offset=\"0\"\n" +
    "									media-query=\"max-width: 959px\"\n" +
    "									sticky-class=\"sticked\">\n" +
    "						<md-button\n" +
    "							class=\"md-icon-button\"\n" +
    "							ng-click=\"vm.moveMonth(-1)\"\n" +
    "							aria-label=\"Mês anterior\">\n" +
    "							<md-icon md-svg-icon=\"md-tabs-arrow\">«</md-icon>\n" +
    "						</md-button>\n" +
    "						<div flex></div>\n" +
    "						<h2 class=\"md-title\">\n" +
    "							<span>{{vm.title}}</span>\n" +
    "						</h2>\n" +
    "						<div flex></div>\n" +
    "						<md-button\n" +
    "							class=\"md-icon-button\"\n" +
    "							ng-click=\"vm.moveMonth(1)\"\n" +
    "							aria-label=\"Mês seguinte\">\n" +
    "							<md-icon md-svg-icon=\"md-tabs-arrow\" class=\"moveNext\"></md-icon>\n" +
    "						</md-button>\n" +
    "					</md-card-header>\n" +
    "					<md-divider></md-divider>\n" +
    "					<md-card-content>\n" +
    "						<md-grid-list md-cols=\"7\"\n" +
    "									  md-row-height=\"3:1\"\n" +
    "									  md-gutter=\"0px\">\n" +
    "							<md-grid-tile md-rowspan=\"1\"\n" +
    "										  md-colspan=\"1\"\n" +
    "										  style=\"background: #fff\"\n" +
    "										  ng-repeat=\"label in vm.labels track by $index\">\n" +
    "								<small style=\"font-weight: bold;\">{{label}}</small>\n" +
    "							</md-grid-tile>\n" +
    "						</md-grid-list>\n" +
    "\n" +
    "						<md-grid-list md-cols=\"7\"\n" +
    "									  md-row-height=\"1:1\"\n" +
    "									  md-row-height-gt-xs=\"3:2\"\n" +
    "									  md-gutter=\"0px\">\n" +
    "							<md-grid-tile md-rowspan=\"1\"\n" +
    "										  md-colspan=\"1\"\n" +
    "										  ng-repeat=\"dt in vm.days track by $index\"\n" +
    "										  ng-click=\"vm.select(dt)\"\n" +
    "										  class=\"monthview-dateCell\"\n" +
    "										  ng-focus=\"focus = true;\"\n" +
    "										  ng-blur=\"focus = false;\"\n" +
    "										  ng-mouseleave=\"hover = false\"\n" +
    "										  ng-mouseenter=\"hover = true\"\n" +
    "										  ng-class=\"{\n" +
    "					  			'md-whiteframe-8dp': hover || focus,\n" +
    "								'monthview-current': dt.current&&!dt.selected&&!dt.hasEvent,\n" +
    "								'monthview-secondary-with-event': dt.secondary&&dt.hasEvent,\n" +
    "								'monthview-secondary': dt.secondary,\n" +
    "								'monthview-selected': dt.selected,\n" +
    "								'lastDayOfWeek': (($index + 1) % 7) === 0\n" +
    "								}\">\n" +
    "								<div ng-class=\"{'text-muted':dt.secondary}\">\n" +
    "								<span class=\"date md-subheader\">\n" +
    "									{{dt.label}}\n" +
    "								</span>\n" +
    "									<!--<div ng-if=\"vm.showEventPins\"\n" +
    "										 class=\"month-events\"\n" +
    "										 ng-class=\"{ sm: vm.$mdMedia('gt-xs'),\n" +
    "												 md: vm.$mdMedia('gt-sm'),\n" +
    "												 lg: vm.$mdMedia('gt-md')}\">\n" +
    "										<div class=\"month-event-pin left\"\n" +
    "											 ng-style=\"{'background-color': event.color || vm.defaultEventColor }\"\n" +
    "											 ng-repeat=\"event in dt.events track by $index\"></div>\n" +
    "									</div>-->\n" +
    "\n" +
    "									<div ng-if=\"vm.showEventPins && dt.hasEvent\"\n" +
    "										 class=\"month-events\"\n" +
    "										 ng-class=\"{ sm: vm.$mdMedia('gt-xs'),\n" +
    "												 md: vm.$mdMedia('gt-sm'),\n" +
    "												 lg: vm.$mdMedia('gt-md')}\">\n" +
    "										<div class=\"month-event-pin left\"\n" +
    "											 ng-style=\"{'background-color': source.color || vm.defaultEventColor }\"\n" +
    "											 ng-repeat=\"source in dt.sources track by source.etag\">\n" +
    "										</div>\n" +
    "									</div>\n" +
    "								</div>\n" +
    "							</md-grid-tile>\n" +
    "						</md-grid-list>\n" +
    "					</md-card-content>\n" +
    "				</md-card>\n" +
    "			</div>\n" +
    "			<md-card id=\"day-events\"\n" +
    "					 ng-if=\"vm.showEventList\"\n" +
    "					 flex\n" +
    "					 md-swipe-left='vm.moveDay(1)'\n" +
    "					 md-swipe-right='vm.moveDay(-1)'\n" +
    "					 class=\"event-inner\"\n" +
    "					 ng-class=\"{ md: vm.$mdMedia('gt-sm')}\">\n" +
    "				<md-card-header layout='row'\n" +
    "								layout-align=\"space-between center\"\n" +
    "								sticky\n" +
    "								offset=\"55\"\n" +
    "								media-query=\"max-width: 959px\"\n" +
    "								sticky-class=\"sticked\">\n" +
    "					<md-card-header-text\n" +
    "						layout\n" +
    "						layout-align=\"center\"\n" +
    "						layout-align-gt-sm=\"start\">\n" +
    "						<span class=\"md-title\">{{vm.selectedDate|date: vm.formatDay }}</span>\n" +
    "						<span class=\"md-subhead\">{{vm.selectedDate|date: 'EEEE'}}</span>\n" +
    "					</md-card-header-text>\n" +
    "				</md-card-header>\n" +
    "				<md-divider></md-divider>\n" +
    "				<md-card-content>\n" +
    "					<div ng-if=\"!vm.selectedDate.events\">\n" +
    "						<p>Nenhum evento encontrado</p>\n" +
    "					</div>\n" +
    "					<div class=\"event-inner md-whiteframe-2dp md-padding\"\n" +
    "						 ng-repeat=\"event in vm.selectedDate.events track by event.id\"\n" +
    "						 ng-style=\"{'background-color': event.color || vm.defaultEventColor }\">\n" +
    "						<div class=\"md-body-2\">\n" +
    "							<strong>{{event.summary}}</strong></div>\n" +
    "						<div class=\"md-body-2\">{{event.startTime|date: vm.formatHourColumn}} - {{event.endTime|date: vm.formatHourColumn}}</div>\n" +
    "					</div>\n" +
    "				</md-card-content>\n" +
    "			</md-card>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "</div>\n" +
    "");
}]);
