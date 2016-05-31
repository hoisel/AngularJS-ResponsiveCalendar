angular.module("ui.rCalendar.tpls", ["template/rcalendar/calendar.html","template/rcalendar/day.html","template/rcalendar/month.html","template/rcalendar/week.html"]);
angular.module('ui.rCalendar', ['ui.rCalendar.tpls'])
    .constant('calendarConfig', {
        formatDay: 'dd',
        formatDayHeader: 'EEE',
        formatDayTitle: 'MMMM dd, yyyy',
        formatWeekTitle: 'MMMM yyyy, Week w',
        formatMonthTitle: 'MMMM yyyy',
        formatWeekViewDayHeader: 'EEE d',
        formatHourColumn: 'HH:mm',
        calendarMode: 'month',
        showWeeks: false,
        showEventDetail: true,
        startingDay: 0,
        eventSource: null,
        queryMode: 'local'
    })
    .controller('ui.rCalendar.CalendarController', ['$scope', '$attrs', '$parse', '$interpolate', '$log', '$mdMedia', 'dateFilter', 'calendarConfig', function ($scope, $attrs, $parse, $interpolate, $log, $mdMedia, dateFilter, calendarConfig) {
        'use strict';
        var self = this,
            ngModelCtrl = {$setViewValue: angular.noop}; // nullModelCtrl;

        // Configuration attributes
        angular.forEach(['formatDay', 'formatDayHeader', 'formatDayTitle', 'formatWeekTitle', 'formatMonthTitle', 'formatWeekViewDayHeader', 'formatHourColumn',
            'showWeeks', 'showEventDetail', 'startingDay', 'eventSource', 'queryMode'], function (key, index) {
            self[key] = angular.isDefined($attrs[key]) ? (index < 7 ? $interpolate($attrs[key])($scope.$parent) : $scope.$parent.$eval($attrs[key])) : calendarConfig[key];
        });

        $scope.$mdMedia = $mdMedia;

        $scope.$parent.$watch($attrs.eventSource, function (value) {
            self.onEventSourceChanged(value);
        });

        $scope.calendarMode = $scope.calendarMode || calendarConfig.calendarMode;
        if (angular.isDefined($attrs.initDate)) {
            self.currentCalendarDate = $scope.$parent.$eval($attrs.initDate);
        }
        if (!self.currentCalendarDate) {
            self.currentCalendarDate = new Date();
            if ($attrs.ngModel && !$scope.$parent.$eval($attrs.ngModel)) {
                $parse($attrs.ngModel).assign($scope.$parent, self.currentCalendarDate);
            }
        }

        self.init = function (ngModelCtrl_) {
            ngModelCtrl = ngModelCtrl_;

            ngModelCtrl.$render = function () {
                self.render();
            };
        };

        self.render = function () {
            if (ngModelCtrl.$modelValue) {
                var date = new Date(ngModelCtrl.$modelValue),
                    isValid = !isNaN(date);

                if (isValid) {
                    this.currentCalendarDate = date;
                } else {
                    $log.error('"ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
                }
                ngModelCtrl.$setValidity('date', isValid);
            }
            this.refreshView();
        };

        self.refreshView = function () {
            if (this.mode) {
                this.range = this._getRange(this.currentCalendarDate);
                this._refreshView();
                this.rangeChanged();
            }
        };

        // Split array into smaller arrays
        self.split = function (arr, size) {
            var arrays = [];
            while (arr.length > 0) {
                arrays.push(arr.splice(0, size));
            }
            return arrays;
        };

        self.onEventSourceChanged = function (value) {
            self.eventSource = value;
            if (self._onDataLoaded) {
                self._onDataLoaded();
            }
        };

        $scope.move = function (direction) {
            var step = self.mode.step,
                currentCalendarDate = self.currentCalendarDate,
                year = currentCalendarDate.getFullYear() + direction * (step.years || 0),
                month = currentCalendarDate.getMonth() + direction * (step.months || 0),
                date = currentCalendarDate.getDate() + direction * (step.days || 0),
                firstDayInNextMonth;

            currentCalendarDate.setFullYear(year, month, date);
            if ($scope.calendarMode === 'month') {
                firstDayInNextMonth = new Date(year, month + 1, 1);
                if (firstDayInNextMonth.getTime() <= currentCalendarDate.getTime()) {
                    self.currentCalendarDate = new Date(firstDayInNextMonth - 24 * 60 * 60 * 1000);
                }
            }
            ngModelCtrl.$setViewValue(self.currentCalendarDate);
            self.refreshView();
        };

        self.move = function (direction) {
            $scope.move(direction);
        };

        self.rangeChanged = function () {
            if (self.queryMode === 'local') {
                if (self.eventSource && self._onDataLoaded) {
                    self._onDataLoaded();
                }
            } else if (self.queryMode === 'remote') {
                if ($scope.rangeChanged) {
                    $scope.rangeChanged({
                        startTime: this.range.startTime,
                        endTime: this.range.endTime
                    });
                }
            }
        };
    }])
    .directive('calendar', function () {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/rcalendar/calendar.html',
            scope: {
                calendarMode: '=',
                rangeChanged: '&',
                eventSelected: '&',
                timeSelected: '&'
            },
            require: ['calendar', '?^ngModel'],
            controller: 'ui.rCalendar.CalendarController',
            link: function (scope, element, attrs, ctrls) {
                var calendarCtrl = ctrls[0], ngModelCtrl = ctrls[1];

                if (ngModelCtrl) {
                    calendarCtrl.init(ngModelCtrl);
                }

                scope.$on('changeDate', function (event, direction) {
                    calendarCtrl.move(direction);
                });

                scope.$on('eventSourceChanged', function (event, value) {
                    calendarCtrl.onEventSourceChanged(value);
                });
            }
        };
    })
    .directive('monthview', ['dateFilter', function (dateFilter) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/rcalendar/month.html',
            require: ['^calendar', '?^ngModel'],
            link: function (scope, element, attrs, ctrls) {
                var ctrl = ctrls[0],
                    ngModelCtrl = ctrls[1];
                scope.showWeeks = ctrl.showWeeks;
                scope.showEventDetail = ctrl.showEventDetail;

                ctrl.mode = {
                    step: {months: 1}
                };

                function getDates(startDate, n) {
                    var dates = new Array(n), current = new Date(startDate), i = 0;
                    current.setHours(12); // Prevent repeated dates because of timezone bug
                    while (i < n) {
                        dates[i++] = new Date(current);
                        current.setDate(current.getDate() + 1);
                    }
                    return dates;
                }

                scope.select = function (selectedDate) {
                    var rows = scope.rows;
                    if (rows) {
                        var currentCalendarDate = ctrl.currentCalendarDate;
                        var currentMonth = currentCalendarDate.getMonth();
                        var currentYear = currentCalendarDate.getFullYear();
                        var selectedMonth = selectedDate.getMonth();
                        var selectedYear = selectedDate.getFullYear();
                        var direction = 0;
                        if (currentYear === selectedYear) {
                            if (currentMonth !== selectedMonth) {
                                direction = currentMonth < selectedMonth ? 1 : -1;
                            }
                        } else {
                            direction = currentYear < selectedYear ? 1 : -1;
                        }

                        ctrl.currentCalendarDate = selectedDate;
                        if (ngModelCtrl) {
                            ngModelCtrl.$setViewValue(selectedDate);
                        }
                        if (direction === 0) {
                            for (var row = 0; row < 6; row += 1) {
                                for (var date = 0; date < 7; date += 1) {
                                    var selected = ctrl.compare(selectedDate, rows[row][date].date) === 0;
                                    rows[row][date].selected = selected;
                                    if (selected) {
                                        scope.selectedDate = rows[row][date];
                                    }
                                }
                            }
                        } else {
                            ctrl.refreshView();
                        }

                        if (scope.timeSelected) {
                            scope.timeSelected({selectedTime: selectedDate});
                        }
                    }
                };

                ctrl._refreshView = function () {
                    var startDate = ctrl.range.startTime,
                        date = startDate.getDate(),
                        month = (startDate.getMonth() + (date !== 1 ? 1 : 0)) % 12,
                        year = startDate.getFullYear() + (date !== 1 && month === 0 ? 1 : 0);

                    var days = getDates(startDate, 42);
                    for (var i = 0; i < 42; i++) {
                        days[i] = angular.extend(createDateObject(days[i], ctrl.formatDay), {
                            secondary: days[i].getMonth() !== month
                        });
                    }

                    scope.labels = new Array(7);
                    for (var j = 0; j < 7; j++) {
                        scope.labels[j] = dateFilter(days[j].date, ctrl.formatDayHeader);
                    }

                    var headerDate = new Date(year, month, 1);
                    scope.$parent.title = dateFilter(headerDate, ctrl.formatMonthTitle);
                    scope.rows = ctrl.split(days, 7);

                    if (scope.showWeeks) {
                        scope.weekNumbers = [];
                        var thursdayIndex = (4 + 7 - ctrl.startingDay) % 7,
                            numWeeks = scope.rows.length;
                        for (var curWeek = 0; curWeek < numWeeks; curWeek++) {
                            scope.weekNumbers.push(
                                getISO8601WeekNumber(scope.rows[curWeek][thursdayIndex].date));
                        }
                    }
                };

                function createDateObject(date, format) {
                    return {
                        date: date,
                        label: dateFilter(date, format),
                        selected: ctrl.compare(date, ctrl.currentCalendarDate) === 0,
                        current: ctrl.compare(date, new Date()) === 0
                    };
                }

                function compareEvent(event1, event2) {
                    if (event1.allDay) {
                        return 1;
                    } else if (event2.allDay) {
                        return -1;
                    } else {
                        return (event1.startTime.getTime() - event2.startTime.getTime());
                    }
                }

                ctrl._onDataLoaded = function () {
                    var eventSource = ctrl.eventSource,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        timeZoneOffset = -new Date().getTimezoneOffset(),
                        utcStartTime = new Date(startTime.getTime() + timeZoneOffset * 60000),
                        utcEndTime = new Date(endTime.getTime() + timeZoneOffset * 60000),
                        rows = scope.rows,
                        oneDay = 86400000,
                        eps = 0.001,
                        row,
                        date,
                        hasEvent = false;

                    if (rows.hasEvent) {
                        for (row = 0; row < 6; row += 1) {
                            for (date = 0; date < 7; date += 1) {
                                if (rows[row][date].hasEvent) {
                                    rows[row][date].events = null;
                                    rows[row][date].hasEvent = false;
                                }
                            }
                        }
                    }

                    for (var i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);
                        var st;
                        var et;

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                st = utcStartTime;
                                et = utcEndTime;
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                st = startTime;
                                et = endTime;
                            }
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
                            rows[rowIndex][dayIndex].hasEvent = true;
                            eventSet = rows[rowIndex][dayIndex].events;
                            if (eventSet) {
                                eventSet.push(event);
                            } else {
                                eventSet = [];
                                eventSet.push(event);
                                rows[rowIndex][dayIndex].events = eventSet;
                            }
                            index += 1;
                        }
                    }

                    for (row = 0; row < 6; row += 1) {
                        for (date = 0; date < 7; date += 1) {
                            if (rows[row][date].hasEvent) {
                                hasEvent = true;
                                rows[row][date].events.sort(compareEvent);
                            }
                        }
                    }
                    rows.hasEvent = hasEvent;

                    var findSelected = false;
                    for (row = 0; row < 6; row += 1) {
                        for (date = 0; date < 7; date += 1) {
                            if (rows[row][date].selected) {
                                scope.selectedDate = rows[row][date];
                                findSelected = true;
                                break;
                            }
                        }
                        if (findSelected) {
                            break;
                        }
                    }
                };

                ctrl.compare = function (date1, date2) {
                    return (new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()) );
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        firstDayOfMonth = new Date(year, month, 1),
                        difference = ctrl.startingDay - firstDayOfMonth.getDay(),
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
                };

                function getISO8601WeekNumber(date) {
                    var checkDate = new Date(date);
                    checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
                    var time = checkDate.getTime();
                    checkDate.setMonth(0); // Compare with Jan 1
                    checkDate.setDate(1);
                    return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
                }

                ctrl.refreshView();
            }
        };
    }])
    .directive('dayview', ['dateFilter', '$timeout', function (dateFilter, $timeout) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/rcalendar/day.html',
            require: '^calendar',
            link: function (scope, element, attrs, ctrl) {
                scope.formatHourColumn = ctrl.formatHourColumn;

                ctrl.mode = {
                    step: {days: 1}
                };

                function createDateObject(date, format) {
                    return {
                        date: date,
                        label: dateFilter(date, format)
                    };
                }

                scope.select = function (selectedTime) {
                    if (scope.timeSelected) {
                        scope.timeSelected({selectedTime: selectedTime});
                    }
                };

                ctrl._onDataLoaded = function () {
                    var eventSource = ctrl.eventSource,
                        len = eventSource.length,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(startTime.getTime()),
                        utcEndTime = new Date(endTime.getTime()),
                        day = scope.day;


                    day.events = [];
                    day.allDayEvents = [];
                    day.hasEvent = false;


                    for (var i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                day.allDayEvents.push(event);
                            }
                        }
                        else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                day.events.push(event);
                            }
                        }

                        day.hasEvent = !!day.events.length || !!day.allDayEvents.length;
                    }
                };

                ctrl._refreshView = function () {
                    var startingDate = ctrl.range.startTime;

                    scope.day = createDateObject(startingDate, ctrl.formatDayHeader);
                    scope.$parent.title = dateFilter(startingDate, ctrl.formatDayTitle); //todo: remover?
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        date = currentDate.getDate(),
                        startTime = new Date(year, month, date),
                        endTime = new Date(year, month, date + 1);

                    return {
                        startTime: startTime,
                        endTime: endTime
                    };
                };

                ctrl.refreshView();
            }
        };
    }]);
angular.module("template/rcalendar/calendar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rcalendar/calendar.html",
    "<div ng-switch=\"calendarMode\" layout=\"column\" ng-cloak>\n" +
    "	<md-toolbar>\n" +
    "		<div class='md-toolbar-tools' layout='row'>\n" +
    "			<md-button class=\"md-icon-button\" ng-click=\"move(-1)\" aria-label=\"Mês anterior\">\n" +
    "				<md-icon md-svg-icon=\"md-tabs-arrow\">«</md-icon>\n" +
    "			</md-button>\n" +
    "			<div flex></div>\n" +
    "			<h2 class='calendar-md-title'>\n" +
    "				<span>{{title}}</span></h2>\n" +
    "			<div flex></div>\n" +
    "			<md-button class=\"md-icon-button\" ng-click=\"move(1)\" aria-label=\"Mês seguinte\">\n" +
    "				<md-icon md-svg-icon=\"md-tabs-arrow\" class=\"moveNext\"></md-icon>\n" +
    "			</md-button>\n" +
    "		</div>\n" +
    "	</md-toolbar>\n" +
    "	<md-content layout-fill md-swipe-left='move(1)' md-swipe-right='move(-1)'>\n" +
    "		<dayview ng-switch-when=\"day\"></dayview>\n" +
    "		<monthview ng-switch-when=\"month\"></monthview>\n" +
    "	</md-content>\n" +
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
    "<div class=\"md-padding month-view\">\n" +
    "	<!--\n" +
    "		<div style=\"position:  fixed;\">\n" +
    "			<div ng-show=\"$mdMedia('gt-xs')\">\n" +
    "				SMALL\n" +
    "			</div>\n" +
    "\n" +
    "			<div ng-show=\"$mdMedia('gt-sm')\">\n" +
    "				MEDIUM\n" +
    "			</div>\n" +
    "\n" +
    "			<div ng-show=\"$mdMedia('gt-md')\">\n" +
    "				LARGE\n" +
    "			</div>\n" +
    "\n" +
    "			<div ng-show=\"$mdMedia('xl')\">\n" +
    "				X-LARGE\n" +
    "			</div>\n" +
    "		</div>-->\n" +
    "	<div layout=\"column\" layout-gt-sm=\"row\">\n" +
    "		<div flex flex-gt-sm=\"60\" flex-gt-lg=\"80\">\n" +
    "			<md-grid-list md-cols=\"7\"\n" +
    "						  md-row-height=\"3:1\"\n" +
    "						  md-gutter=\"0px\">\n" +
    "				<md-grid-tile md-rowspan=\"1\"\n" +
    "							  md-colspan=\"1\"\n" +
    "							  ng-repeat=\"label in labels track by $index\">\n" +
    "					<small style=\"font-weight: bold;\">{{label}}</small>\n" +
    "				</md-grid-tile>\n" +
    "			</md-grid-list>\n" +
    "\n" +
    "			<md-grid-list md-cols=\"7\"\n" +
    "						  md-row-height=\"1:1\"\n" +
    "						  md-row-height-gt-xs=\"3:2\"\n" +
    "						  md-gutter=\"0px\">\n" +
    "				<md-grid-tile md-rowspan=\"1\"\n" +
    "							  md-colspan=\"1\"\n" +
    "							  ng-repeat=\"dt in rows[0].concat(rows[1])\n" +
    "					  						  .concat(rows[2])\n" +
    "					  						  .concat(rows[3])\n" +
    "					  						  .concat(rows[4])\n" +
    "					  						  .concat(rows[5]) track by dt.date\"\n" +
    "							  ng-click=\"select(dt.date)\"\n" +
    "							  class=\"monthview-dateCell\"\n" +
    "							  ng-focus=\"focus = true;\"\n" +
    "							  ng-blur=\"focus = false;\"\n" +
    "							  ng-mouseleave=\"hover = false\"\n" +
    "							  ng-mouseenter=\"hover = true\"\n" +
    "							  ng-class=\"{\n" +
    "					  			'md-whiteframe-12dp': hover || focus,\n" +
    "								'monthview-current': dt.current&&!dt.selected&&!dt.hasEvent,\n" +
    "								'monthview-secondary-with-event': dt.secondary&&dt.hasEvent,\n" +
    "								'monthview-secondary': dt.secondary,\n" +
    "								'monthview-selected': dt.selected,\n" +
    "								'lastDayOfWeek': (($index + 1) % 7) === 0\n" +
    "								}\">\n" +
    "					<div ng-class=\"{'text-muted':dt.secondary}\">\n" +
    "						<span class=\"date\">\n" +
    "							{{dt.label}}\n" +
    "						</span>\n" +
    "						<div class=\"month-events\" ng-class=\"{ sm: $mdMedia('gt-xs'),  md: $mdMedia('gt-sm'), lg: $mdMedia('gt-md')}\">\n" +
    "							<div class=\"month-event left\" ng-repeat=\"ev in dt.events track by ev.title\">\n" +
    "								<md-tooltip>\n" +
    "									{{ev.title}}\n" +
    "								</md-tooltip>\n" +
    "							</div>\n" +
    "						</div>\n" +
    "					</div>\n" +
    "				</md-grid-tile>\n" +
    "			</md-grid-list>\n" +
    "		</div>\n" +
    "\n" +
    "		<md-list id=\"events-detail\"\n" +
    "				 ng-if=\"showEventDetail\"\n" +
    "				 ng-class=\"{ md: $mdMedia('gt-sm')}\"\n" +
    "				 flex\n" +
    "				 flex-gt-sm=\"40\"\n" +
    "				 flex-gt-lg=\"20\">\n" +
    "\n" +
    "			<md-subheader ng-if=\"$mdMedia('gt-sm')\">Eventos do dia: {{selectedDate.date|date: 'dd/MM/yyyy'}}</md-subheader>\n" +
    "			<md-list-item ng-repeat=\"event in selectedDate.events\" ng-if=\"selectedDate.events\" layout=\"row\">\n" +
    "\n" +
    "				<!--<div flex=\"5\" flex-gt-md=\"5\" layout=\"row\" layout-align=\"center center\">\n" +
    "					<div ng-class=\"{ sm: $mdMedia('gt-xs'),  md: $mdMedia('gt-sm'), lg: $mdMedia('gt-md')}\">\n" +
    "						<div class=\"month-event\">\n" +
    "						</div>\n" +
    "					</div>\n" +
    "				</div>-->\n" +
    "				<div flex=\"30\"\n" +
    "					 flex-gt-md=\"20\"\n" +
    "					 flex-xl=\"25\"\n" +
    "					 class=\"event-time-column\">\n" +
    "					<small ng-if=\"!event.allDay\">\n" +
    "						{{event.startTime|date: 'HH:mm'}} - {{event.endTime|date: 'HH:mm'}}\n" +
    "					</small>\n" +
    "					<small ng-if=\"event.allDay\">O dia todo</small>\n" +
    "				</div>\n" +
    "				<div flex=\"70\"\n" +
    "					 flex-gt-md=\"80\"\n" +
    "					 flex-xl=\"85\"\n" +
    "					 class=\"event-detail-column\">\n" +
    "					<span class=\"event-detail-title\" ng-click=\"eventSelected({event:event})\"> {{event.title}}</span><br>\n" +
    "					<!--<small class=\"event-detail-body\" ng-if=\"event.description\"> {{event.description}}</small>-->\n" +
    "					<md-divider ng-if=\"!$last\"></md-divider>\n" +
    "				</div>\n" +
    "\n" +
    "			</md-list-item>\n" +
    "\n" +
    "			<md-list-item ng-if=\"!selectedDate.events\">\n" +
    "				<span>Sem Eventos</span>\n" +
    "			</md-list-item>\n" +
    "		</md-list>\n" +
    "\n" +
    "		<!--\n" +
    "				<div ng-if=\"showEventDetail\"\n" +
    "					 class=\"event-detail-container\"\n" +
    "					 flex\n" +
    "					 flex-gt-md=\"30\"\n" +
    "					 flex-gt-lg=\"20\">\n" +
    "					<div class=\"scrollable\" style=\"height: 200px\">\n" +
    "						<table>\n" +
    "							<tr ng-repeat=\"event in selectedDate.events\" ng-if=\"selectedDate.events\">\n" +
    "								<td ng-if=\"!event.allDay\" class=\"monthview-eventdetail-timecolumn\">{{event.startTime|date: 'HH:mm'}}\n" +
    "									-\n" +
    "									{{event.endTime|date: 'HH:mm'}}\n" +
    "								</td>\n" +
    "								<td ng-if=\"event.allDay\" class=\"monthview-eventdetail-timecolumn\">All day</td>\n" +
    "								<td class=\"event-detail\" ng-click=\"eventSelected({event:event})\">{{event.title}}</td>\n" +
    "							</tr>\n" +
    "							<tr ng-if=\"!selectedDate.events\">\n" +
    "								<td class=\"no-event-label\">No Events</td>\n" +
    "							</tr>\n" +
    "						</table>\n" +
    "					</div>\n" +
    "				</div>-->\n" +
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
