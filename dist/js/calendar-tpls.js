angular.module("ui.rCalendar.tpls", ["template/rcalendar/calendar.html","template/rcalendar/day.html","template/rcalendar/month.html","template/rcalendar/week.html"]);
angular.module('ui.rCalendar', ['ui.rCalendar.tpls'])
    .constant('calendarConfig', {
        formatDay: 'dd',
        formatDayHeader: 'EEE',
        formatDayTitle: 'MMMM dd, yyyy',
        formatWeekTitle: 'MMMM yyyy, Week w',
        formatMonthTitle: 'MMMM yyyy',
        formatWeekViewDayHeader: 'EEE d',
        formatHourColumn: 'dd \'de\' MMMM, HH:mm',
        startingDay: 0,
        eventSource: null,
        queryMode: 'local'
    })
    .controller('ui.rCalendar.CalendarController', ['$scope', '$attrs', '$parse', '$interpolate', '$log', '$mdMedia', 'dateFilter', 'calendarConfig', function ($scope, $attrs, $parse, $interpolate, $log, $mdMedia, dateFilter, calendarConfig) {
        'use strict';
        var self = this;
        var ngModelCtrl = {$setViewValue: angular.noop}; // nullModelCtrl;

        // Configuration attributes
        angular.forEach(['formatDay',
            'formatDayHeader',
            'formatDayTitle',
            'formatWeekTitle',
            'formatMonthTitle',
            'formatWeekViewDayHeader',
            'formatHourColumn',
            'startingDay',
            'eventSource',
            'queryMode'],
            function (key, index) {
                self[key] = angular.isDefined($attrs[key]) ? (index < 7 ? $interpolate($attrs[key])($scope.$parent) : $scope.$parent.$eval($attrs[key])) : calendarConfig[key];
            });
        
        $scope.$parent.$watch($attrs.eventSource, function (value) {
            self.onEventSourceChanged(value);
        });

        self.$mdMedia = $mdMedia;

        /**
         *
         * @returns {boolean|*}
         */
        self.isValid = function(  ) {
            return ngModelCtrl.$valid;
        };

        /**
         *
         * @param ngModelCtrl_
         */
        self.init = function (ngModelCtrl_) {
            ngModelCtrl = ngModelCtrl_;
            ngModelCtrl.$formatters.push(validateDate);

            ngModelCtrl.$render = function () {
                self._selectedDate = ngModelCtrl.$viewValue || new Date();
                refreshView();
            };
        };

        /**
         *
         * @param value
         */
        self.onEventSourceChanged = function (value) {
            self.eventSource = value;
            if (onDataLoaded) {
                onDataLoaded();
            }
        };

        /**
         *
         * @param step
         */
        self.moveMonth = function (step) {
            var year = self._selectedDate.getFullYear();
            var month = self._selectedDate.getMonth() + step;
            var date = self._selectedDate.getDate();
            var newDate = new Date(year, month, date);
            var firstDayInNextMonth = new Date(year, month + 1, 1);

            if (firstDayInNextMonth.getTime() <= newDate.getTime()) {
                newDate = new Date(firstDayInNextMonth - 24 * 60 * 60 * 1000);
            }

            self._selectedDate = newDate;
            ngModelCtrl.$setViewValue(newDate);

            refreshView();
        };

        /**
         *
         * @param step
         */
        self.moveDay = function (step) {
            var _selectedDate = self._selectedDate;
            var year = _selectedDate.getFullYear();
            var month = _selectedDate.getMonth();
            var date = _selectedDate.getDate() + step;
            var newDate = new Date(year, month, date);

            self._selectedDate = newDate;
            ngModelCtrl.$setViewValue(newDate);

            refreshView();
        };

        /**
         *
         * @param selectedDate
         */
        self.select = function(selectedDate) {
            var weeks =  self.weeks;
            var currentMonth;
            var currentYear;
            var selectedMonth;
            var selectedYear;
            var direction;
            var selected;
            var row;
            var date;

            if (weeks) {
                currentMonth = self._selectedDate.getMonth();
                currentYear = self._selectedDate.getFullYear();
                selectedMonth = selectedDate.getMonth();
                selectedYear = selectedDate.getFullYear();
                direction = 0;
                
                if (currentYear === selectedYear) {
                    if (currentMonth !== selectedMonth) {
                        direction = currentMonth < selectedMonth ? 1 : -1;
                    }
                } else {
                    direction = currentYear < selectedYear ? 1 : -1;
                }

                self._selectedDate = selectedDate;
                if (ngModelCtrl) {
                    ngModelCtrl.$setViewValue(selectedDate);
                }
                if (direction === 0) {
                    for (row = 0; row < 6; row += 1) {
                        for (date = 0; date < 7; date += 1) {
                            selected = compare(selectedDate, weeks[row][date]) === 0;
                            weeks[row][date].selected = selected;
                            if (selected) {
                                self.selectedDate = weeks[row][date];
                            }
                        }
                    }
                } else {
                    refreshView();
                }

                if ( self.timeSelected) {
                    self.timeSelected({selectedTime: selectedDate});
                }
            }
        };


        self.mode = {
            step: {months: 1}
        };

        /////////////////////////////////////////////////////////////////////
        // Private members
        /////////////////////////////////////////////////////////////////////

        /**
         *
         */
        function onDataLoaded() {
            var events = self.eventSource;
            var len = events ? events.length : 0;
            var startTime = self.range.startTime;
            var endTime = self.range.endTime;
            var weeks =  self.weeks;
            var oneDay = 86400000;
            var eps = 0.001;
            var row;
            var date;
            var hasEvent = false;
            var findSelected = false;

            if (weeks.hasEvent) {
                for (row = 0; row < 6; row += 1) {
                    for (date = 0; date < 7; date += 1) {
                        if (weeks[row][date].hasEvent) {
                            weeks[row][date].events = null;
                            weeks[row][date].hasEvent = false;
                        }
                    }
                }
            }

            for (var i = 0; i < len; i += 1) {
                var event = events[i];
                var eventStartTime = new Date(event.startTime);
                var eventEndTime = new Date(event.endTime);
                var st;
                var et;

                if (eventEndTime <= startTime || eventStartTime >= endTime) {
                    continue;
                } else {
                    st = startTime;
                    et = endTime;
                }

                var timeDifferenceStart;
                if (eventStartTime <= st) {
                    timeDifferenceStart = 0;
                } else {
                    timeDifferenceStart = (eventStartTime - st) / oneDay;
                }

                var timeDifferenceEnd;
                if (eventEndTime >= et) {
                    timeDifferenceEnd = (et - st) / oneDay;
                } else {
                    timeDifferenceEnd = (eventEndTime - st) / oneDay;
                }

                var index = Math.floor(timeDifferenceStart);
                var eventSet;
                while (index < timeDifferenceEnd - eps) {
                    var rowIndex = Math.floor(index / 7);
                    var dayIndex = Math.floor(index % 7);
                    weeks[rowIndex][dayIndex].hasEvent = true;
                    eventSet = weeks[rowIndex][dayIndex].events;
                    if (eventSet) {
                        eventSet.push(event);
                    } else {
                        eventSet = [];
                        eventSet.push(event);
                        weeks[rowIndex][dayIndex].events = eventSet;
                    }
                    index += 1;
                }
            }

            for (row = 0; row < 6; row += 1) {
                for (date = 0; date < 7; date += 1) {
                    if (weeks[row][date].hasEvent) {
                        hasEvent = true;
                        weeks[row][date].events.sort(compareEvent);
                    }
                }
            }
            weeks.hasEvent = hasEvent;

            for (row = 0; row < 6; row += 1) {
                for (date = 0; date < 7; date += 1) {
                    if (weeks[row][date].selected) {
                        self.selectedDate = weeks[row][date];
                        findSelected = true;
                        break;
                    }
                }
                if (findSelected) {
                    break;
                }
            }
        }

        /**
         *
         */
        function onViewRefreshed() {
            if (self.queryMode === 'local') {
                if (self.eventSource && onDataLoaded) {
                    onDataLoaded();
                }
            } else if (self.queryMode === 'remote') {
                if (self.viewRefreshed) {
                    self.viewRefreshed({
                        selectedDate: self._selectedDate,
                        range: self.range
                    });
                }
            }
        }

        /**
         * Attach metadata to each day
         * @param days
         * @param month
         */
        function attachDaysMetadata(days, month) {
            for ( var i = 0; i < 42; i++ ) {
                angular.extend( days[ i ], createDayMetadata( days[ i ] ), {
                    secondary: days[ i ].getMonth() !== month
                } );
            }
        }

        /**
         * Create day metadata used by view
         * @param day
         * @returns {{label: *, headerLabel: *, selected: boolean, current: boolean}}
         */
        function createDayMetadata(day) {
            return {
                label: dateFilter(day, self.formatDay),
                headerLabel: dateFilter(day,self.formatDayHeader),
                selected: compare(day, self._selectedDate) === 0,
                current: compare(day, new Date()) === 0
            };
        }

        /**
         * Create labels for calendar days header
         *
         * @param days
         * @returns {Array}
         */
        function createDaysLabels( days ) {
            var labels = new Array(7);
            for (var j = 0; j < 7; j++) {
                labels[j] = dateFilter(days[j], self.formatDayHeader);
            }
            return labels;
        }

        /**
         * Generates n sequential dates from 'startDate'
         *
         * @param startDate - the start date
         * @param n - number de dates to generate from 'startDate'
         * @returns {Array} - The generated dates
         */
        function generateNDaysFrom(startDate, n) {
            var days = new Array(n);
            var current = new Date(startDate);
            var i = 0;

            current.setHours(12); // Prevent repeated dates because of timezone bug

            while (i < n) {
                days[i++] = new Date(current);
                current.setDate(current.getDate() + 1);
            }
            return days;
        }

        /**
         *
         * @param $viewValue
         * @returns {null}
         */
        function validateDate($viewValue) {
            var date = new Date($viewValue);
            var isValid = !isNaN(date);

            if (!isValid) {
                $log.error('"ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
                $log.info('using current date as ngModel');
            }

            ngModelCtrl.$setValidity('date', isValid);
            return isValid ? $viewValue : null;
        }

        /**
         *
         * @param date1
         * @param date2
         * @returns {number}
         */
        function compare(date1, date2) {
            return (new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()) );
        }

        /**
         * Compare two events. Two events are equal if its startTime are equal
         *
         * @param event1
         * @param event2
         * @returns {number} - 0 if events are equal. Other number if are not equal
         */
        function compareEvent(event1, event2) {
            return (event1.startTime.getTime() - event2.startTime.getTime());
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

            if (self.mode) {

                self.range = getRange(self._selectedDate);

                startDate = self.range.startTime;
                day = startDate.getDate();
                month = (startDate.getMonth() + (day !== 1 ? 1 : 0)) % 12;
                year = startDate.getFullYear() + (day !== 1 && month === 0 ? 1 : 0);
                headerDate = new Date(year, month, 1);
                days = generateNDaysFrom(startDate, 42);

                attachDaysMetadata(days, month);

                self.labels = createDaysLabels(days);
                self.title = dateFilter(headerDate, self.formatMonthTitle);
                self.weeks = split(days, 7);

                onViewRefreshed();
            }
        }

        /**
         * Split array into smaller arrays
         *
         * @param arr
         * @param size
         * @returns {Array}
         */
        function split (arr, size) {
            var arrays = [];
            while (arr.length > 0) {
                arrays.push(arr.splice(0, size));
            }
            return arrays;
        }

        /**
         * Generate calendar date range from current date
         *
         * @param currentDate
         * @returns {{startTime: Date, endTime: Date}}
         */
        function getRange(currentDate) {
            var year = currentDate.getFullYear(),
                month = currentDate.getMonth(),
                firstDayOfMonth = new Date(year, month, 1),
                difference = self.startingDay - firstDayOfMonth.getDay(),
                numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : -difference,
                startDate = new Date(firstDayOfMonth),
                endDate;

            if (numDisplayedFromPreviousMonth > 0) {
                startDate.setDate(-numDisplayedFromPreviousMonth + 1);
            }

            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 42);

            return {
                startTime: startDate,
                endTime: endDate
            };
        }
    }])
    .directive('calendar', function () {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/rcalendar/calendar.html',
            bindToController: true,
            controllerAs: 'ctrl',
            scope: {
                viewRefreshed: '&',
                eventSelected: '&',
                timeSelected: '&',
                showEventList: '=',
                showEventPins: '='
            },
            require: ['calendar', '?^ngModel'],
            controller: 'ui.rCalendar.CalendarController',
            link: function (scope, element, attrs, ctrls) {
                var self = ctrls[0];
                var ngModelCtrl = ctrls[1];

                if (ngModelCtrl) {
                    self.init(ngModelCtrl);
                }

                scope.$on('changeDate', function (event, direction) {
                    self.move(direction);
                });

                scope.$on('eventSourceChanged', function (event, value) {
                    self.onEventSourceChanged(value);
                });
            }
        };
    })
    .directive('monthview', function () {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/rcalendar/month.html'
        };
    });
angular.module("template/rcalendar/calendar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rcalendar/calendar.html",
    "<div layout=\"column\" ng-cloak>\n" +
    "	<!--<md-toolbar sticky offset=\"0\" sticky-class=\"fixed\">\n" +
    "		<div class='md-toolbar-tools' layout='row'>\n" +
    "			<md-button class=\"md-icon-button\" ng-click=\"moveMonth(-1)\" aria-label=\"Mês anterior\">\n" +
    "				<md-icon md-svg-icon=\"md-tabs-arrow\">«</md-icon>\n" +
    "			</md-button>\n" +
    "			<div flex></div>\n" +
    "			<h2 class='calendar-md-title'>\n" +
    "				<span>{{title}}</span></h2>\n" +
    "			<div flex></div>\n" +
    "			<md-button class=\"md-icon-button\" ng-click=\"moveMonth(1)\" aria-label=\"Mês seguinte\">\n" +
    "				<md-icon md-svg-icon=\"md-tabs-arrow\" class=\"moveNext\"></md-icon>\n" +
    "			</md-button>\n" +
    "		</div>\n" +
    "	</md-toolbar>-->\n" +
    "	<div>\n" +
    "		<monthview></monthview>\n" +
    "	</div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/rcalendar/day.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rcalendar/day.html",
    "<div>\n" +
    "	<md-list>\n" +
    "		<md-list-item layout=\"row\" layout-align=\"start start\">\n" +
    "			<div flex=\"15\"></div>\n" +
    "			<div layout=\"column\" layout-fill flex=\"85\">\n" +
    "				<md-subheader class=\"md-no-sticky\">19-25 jun</md-subheader>\n" +
    "			</div>\n" +
    "		</md-list-item>\n" +
    "\n" +
    "		<md-list-item layout=\"row\" layout-align=\"start start\">\n" +
    "			<div flex=\"15\">\n" +
    "				<div class=\"md-display-1\">{{day.date.getDate()}}</div>\n" +
    "				<div class=\"md-body-2\">{{day.label}}</div>\n" +
    "			</div>\n" +
    "\n" +
    "			<div layout=\"column\" layout-fill flex=\"85\">\n" +
    "				<div class=\"calendar-event-inner\" ng-repeat=\"event in day.allDayEvents track by $index\">\n" +
    "					<div class=\"md-title\">{{event.title}}</div>\n" +
    "					<div class=\"md-body-2\">O dia todo</div>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</md-list-item>\n" +
    "\n" +
    "		<md-list-item layout=\"row\" layout-align=\"start start\">\n" +
    "			<div flex=\"15\"></div>\n" +
    "\n" +
    "			<div layout=\"column\" layout-fill flex=\"85\">\n" +
    "				<div class=\"calendar-event-inner\" ng-repeat=\"event in day.events track by $index\">\n" +
    "					<div class=\"md-title\">{{event.title}}</div>\n" +
    "					<div class=\"md-body-2\">{{event.startTime|date: formatHourColumn}} - {{event.endTime|date: formatHourColumn}}</div>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</md-list-item>\n" +
    "	</md-list>\n" +
    "</div>");
}]);

angular.module("template/rcalendar/month.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rcalendar/month.html",
    "<div class=\"month-view\">\n" +
    "	<div layout=\"column\" layout-gt-sm=\"row\">\n" +
    "		<div flex>\n" +
    "			<md-card\n" +
    "				id=\"calendar\"\n" +
    "				sticky\n" +
    "				offset=\"0\"\n" +
    "				media-query=\"min-width: 960px\"\n" +
    "				class=\"event-inner\"\n" +
    "				md-swipe-left='ctrl.moveMonth(1)'\n" +
    "				md-swipe-right='ctrl.moveMonth(-1)'>\n" +
    "				<md-card-header layout='row'\n" +
    "								layout-align=\"space-between center\"\n" +
    "								sticky offset=\"0\"\n" +
    "								media-query=\"max-width: 959px\"\n" +
    "								sticky-class=\"sticked\">\n" +
    "					<md-button\n" +
    "						class=\"md-icon-button\"\n" +
    "						ng-click=\"ctrl.moveMonth(-1)\"\n" +
    "						aria-label=\"Mês anterior\">\n" +
    "						<md-icon md-svg-icon=\"md-tabs-arrow\">«</md-icon>\n" +
    "					</md-button>\n" +
    "					<div flex></div>\n" +
    "					<h2 class=\"md-title\">\n" +
    "						<span>{{ctrl.title}}</span>\n" +
    "					</h2>\n" +
    "					<div flex></div>\n" +
    "					<md-button\n" +
    "						class=\"md-icon-button\"\n" +
    "						ng-click=\"ctrl.moveMonth(1)\"\n" +
    "						aria-label=\"Mês seguinte\">\n" +
    "						<md-icon md-svg-icon=\"md-tabs-arrow\" class=\"moveNext\"></md-icon>\n" +
    "					</md-button>\n" +
    "				</md-card-header>\n" +
    "				<md-divider></md-divider>\n" +
    "				<md-card-content>\n" +
    "					<md-grid-list md-cols=\"7\"\n" +
    "								  md-row-height=\"3:1\"\n" +
    "								  md-gutter=\"0px\">\n" +
    "						<md-grid-tile md-rowspan=\"1\"\n" +
    "									  md-colspan=\"1\"\n" +
    "									  style=\"background: #fff\"\n" +
    "									  ng-repeat=\"label in ctrl.labels track by $index\">\n" +
    "							<small style=\"font-weight: bold;\">{{label}}</small>\n" +
    "						</md-grid-tile>\n" +
    "					</md-grid-list>\n" +
    "\n" +
    "					<md-grid-list md-cols=\"7\"\n" +
    "								  md-row-height=\"1:1\"\n" +
    "								  md-row-height-gt-xs=\"3:2\"\n" +
    "								  md-gutter=\"0px\">\n" +
    "						<md-grid-tile md-rowspan=\"1\"\n" +
    "									  md-colspan=\"1\"\n" +
    "									  ng-repeat=\"dt in ctrl.weeks[0].concat(ctrl.weeks[1])\n" +
    "																	.concat(ctrl.weeks[2])\n" +
    "																	.concat(ctrl.weeks[3])\n" +
    "																	.concat(ctrl.weeks[4])\n" +
    "																	.concat(ctrl.weeks[5]) track by dt\"\n" +
    "									  ng-click=\"ctrl.select(dt)\"\n" +
    "									  class=\"monthview-dateCell\"\n" +
    "									  ng-focus=\"focus = true;\"\n" +
    "									  ng-blur=\"focus = false;\"\n" +
    "									  ng-mouseleave=\"hover = false\"\n" +
    "									  ng-mouseenter=\"hover = true\"\n" +
    "									  ng-class=\"{\n" +
    "					  			'md-whiteframe-8dp': hover || focus,\n" +
    "								'monthview-current': dt.current&&!dt.selected&&!dt.hasEvent,\n" +
    "								'monthview-secondary-with-event': dt.secondary&&dt.hasEvent,\n" +
    "								'monthview-secondary': dt.secondary,\n" +
    "								'monthview-selected': dt.selected,\n" +
    "								'lastDayOfWeek': (($index + 1) % 7) === 0\n" +
    "								}\">\n" +
    "							<div ng-class=\"{'text-muted':dt.secondary}\">\n" +
    "								<span class=\"date md-subheader\">\n" +
    "									{{dt.label}}\n" +
    "								</span>\n" +
    "								<div ng-if=\"ctrl.showEventPins\"\n" +
    "									 class=\"month-events\"\n" +
    "									 ng-class=\"{ sm: ctrl.$mdMedia('gt-xs'),\n" +
    "												 md: ctrl.$mdMedia('gt-sm'),\n" +
    "												 lg: ctrl.$mdMedia('gt-md')}\">\n" +
    "									<div class=\"month-event-pin left\"\n" +
    "										 ng-style=\"{'background-color': event.color}\"\n" +
    "										 ng-repeat=\"event in dt.events | orderBy : 'color' track by event.title\"></div>\n" +
    "								</div>\n" +
    "							</div>\n" +
    "						</md-grid-tile>\n" +
    "					</md-grid-list>\n" +
    "				</md-card-content>\n" +
    "			</md-card>\n" +
    "		</div>\n" +
    "		<md-card id=\"day-events\"\n" +
    "				 ng-if=\"ctrl.showEventList\"\n" +
    "				 flex\n" +
    "				 md-swipe-left='ctrl.moveDay(1)'\n" +
    "				 md-swipe-right='ctrl.moveDay(-1)'\n" +
    "				 class=\"event-inner\"\n" +
    "				 ng-class=\"{ md: ctrl.$mdMedia('gt-sm')}\">\n" +
    "			<md-card-header layout='row'\n" +
    "							layout-align=\"space-between center\"\n" +
    "							sticky\n" +
    "							offset=\"55\"\n" +
    "							media-query=\"max-width: 959px\"\n" +
    "							sticky-class=\"sticked\">\n" +
    "				<md-card-header-text\n" +
    "					layout\n" +
    "					layout-align=\"center\"\n" +
    "					layout-align-gt-sm=\"start\">\n" +
    "					<span class=\"md-title\">{{ctrl.selectedDate|date: ctrl.formatDay }}</span>\n" +
    "					<span class=\"md-subhead\">{{ctrl.selectedDate|date: 'EEEE'}}</span>\n" +
    "				</md-card-header-text>\n" +
    "			</md-card-header>\n" +
    "			<md-divider></md-divider>\n" +
    "			<md-card-content>\n" +
    "				<div ng-if=\"!ctrl.selectedDate.events\">\n" +
    "					<p>Nenhum evento encontrado</p>\n" +
    "				</div>\n" +
    "				<div class=\"event-inner md-whiteframe-2dp md-padding\"\n" +
    "					 ng-repeat=\"event in ctrl.selectedDate.events track by $index\"\n" +
    "					 ng-style=\"{'background-color': event.color}\">\n" +
    "					<div class=\"md-body-2\">\n" +
    "						<strong>{{event.title}}</strong></div>\n" +
    "					<div class=\"md-body-2\">{{event.startTime|date: ctrl.formatHourColumn}} - {{event.endTime|date: ctrl.formatHourColumn}}</div>\n" +
    "				</div>\n" +
    "			</md-card-content>\n" +
    "		</md-card>\n" +
    "	</div>\n" +
    "</div>");
}]);

angular.module("template/rcalendar/week.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rcalendar/week.html",
    "<div>\n" +
    "    <table class=\"table table-bordered table-fixed weekview-header\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th class=\"calendar-hour-column\"></th>\n" +
    "            <th ng-repeat=\"dt in dates\" class=\"text-center weekview-header-label\">{{dt.date| date:\n" +
    "                formatWeekViewDayHeader}}\n" +
    "            </th>\n" +
    "            <th ng-if=\"gutterWidth>0\" class=\"gutter-column\" ng-style=\"{width: gutterWidth+'px'}\"></th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "    </table>\n" +
    "    <div class=\"weekview-allday-table\">\n" +
    "        <div class=\"weekview-allday-label\">\n" +
    "            all day\n" +
    "        </div>\n" +
    "        <div class=\"weekview-allday-content-wrapper\">\n" +
    "            <table class=\"table table-bordered table-fixed weekview-allday-content-table\">\n" +
    "                <tbody>\n" +
    "                <tr>\n" +
    "                    <td ng-repeat=\"day in dates track by day.date\" class=\"calendar-cell\">\n" +
    "                        <div ng-class=\"{'calendar-event-wrap': day.events}\" ng-if=\"day.events\"\n" +
    "                             ng-style=\"{height: 25*day.events.length+'px'}\">\n" +
    "                            <div ng-repeat=\"displayEvent in day.events\" class=\"calendar-event\"\n" +
    "                                 ng-click=\"eventSelected({event:displayEvent.event})\"\n" +
    "                                 ng-style=\"{top: 25*displayEvent.position+'px', width: 100*(displayEvent.endIndex-displayEvent.startIndex)+'%', height: '25px'}\">\n" +
    "                                <div class=\"calendar-event-inner\">{{displayEvent.event.title}}</div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </td>\n" +
    "                    <td ng-if=\"allDayEventGutterWidth>0\" class=\"gutter-column\"\n" +
    "                        ng-style=\"{width: allDayEventGutterWidth+'px'}\"></td>\n" +
    "                </tr>\n" +
    "                </tbody>\n" +
    "            </table>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"scrollable\" style=\"height: 400px\">\n" +
    "        <table class=\"table table-bordered table-fixed\">\n" +
    "            <tbody>\n" +
    "            <tr ng-repeat=\"row in rows track by $index\">\n" +
    "                <td class=\"calendar-hour-column text-center\">\n" +
    "                    {{row[0].time | date: formatHourColumn}}\n" +
    "                </td>\n" +
    "                <td ng-repeat=\"tm in row track by tm.time\" class=\"calendar-cell\" ng-click=\"select(tm.time)\">\n" +
    "                    <div ng-class=\"{'calendar-event-wrap': tm.events}\" ng-if=\"tm.events\">\n" +
    "                        <div ng-repeat=\"displayEvent in tm.events\" class=\"calendar-event\"\n" +
    "                             ng-click=\"eventSelected({event:displayEvent.event})\"\n" +
    "                             ng-style=\"{left: 100/displayEvent.overlapNumber*displayEvent.position+'%', width: 100/displayEvent.overlapNumber+'%', height: 37*(displayEvent.endIndex-displayEvent.startIndex)+'px'}\">\n" +
    "                            <div class=\"calendar-event-inner\">{{displayEvent.event.title}}</div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </td>\n" +
    "                <td ng-if=\"normalGutterWidth>0\" class=\"gutter-column\" ng-style=\"{width: normalGutterWidth+'px'}\"></td>\n" +
    "            </tr>\n" +
    "            </tbody>\n" +
    "        </table>\n" +
    "    </div>\n" +
    "</div>");
}]);
