angular.module('ui.rCalendar', [])
    .constant('calendarConfig', {
        formatDay: 'dd',
        formatDayHeader: 'EEE',
        formatDayTitle: 'MMMM dd, yyyy',
        formatWeekTitle: 'MMMM yyyy, Week w',
        formatMonthTitle: 'MMMM yyyy',
        formatWeekViewDayHeader: 'EEE d',
        formatHourColumn: 'MMMM dd, HH:mm',
        startingDay: 0,
        eventSource: null,
        queryMode: 'local'
    })
    .controller('ui.rCalendar.CalendarController', ['$scope', '$attrs', '$parse', '$interpolate', '$log', '$mdMedia', 'dateFilter', 'calendarConfig', function ($scope, $attrs, $parse, $interpolate, $log, $mdMedia, dateFilter, calendarConfig) {
        'use strict';
        var self = this;
        var ngModelCtrl = {$setViewValue: angular.noop}; // nullModelCtrl;
        var initDate = new Date();

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

        if (angular.isDefined($attrs.initDate)) {
            initDate = $scope.$parent.$eval($attrs.initDate);
        }

        self.$mdMedia = $mdMedia;


        self.init = function (ngModelCtrl_) {
            ngModelCtrl = ngModelCtrl_;
            ngModelCtrl.$parsers.push(validateDate);

            ngModelCtrl.$render = function () {

                self.currentCalendarDate = ngModelCtrl.$viewValue || initDate;

                refreshView();
            };
        };

        self.onEventSourceChanged = function (value) {
            self.eventSource = value;
            if (onDataLoaded) {
                onDataLoaded();
            }
        };


        self.moveMonth = function (step) {

            var currentCalendarDate = self.currentCalendarDate,
                year = currentCalendarDate.getFullYear(),
                month = currentCalendarDate.getMonth() + step,
                date = currentCalendarDate.getDate(),
                firstDayInNextMonth;

            currentCalendarDate.setFullYear(year, month, date);
            firstDayInNextMonth = new Date(year, month + 1, 1);
            if (firstDayInNextMonth.getTime() <= currentCalendarDate.getTime()) {
                self.currentCalendarDate = new Date(firstDayInNextMonth - 24 * 60 * 60 * 1000);
            }

            ngModelCtrl.$setViewValue(self.currentCalendarDate);

            refreshView();
        };


        self.moveDay = function (step) {
            var currentCalendarDate = self.currentCalendarDate,
                year = currentCalendarDate.getFullYear(),
                month = currentCalendarDate.getMonth(),
                date = currentCalendarDate.getDate() + step;

            currentCalendarDate.setFullYear(year, month, date);
            ngModelCtrl.$setViewValue(self.currentCalendarDate);
            refreshView();
        };


        self.select = function(selectedDate) {
            var weeks =  self.weeks;
            if (weeks) {
                var currentCalendarDate = self.currentCalendarDate;
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

                self.currentCalendarDate = selectedDate;

                if (ngModelCtrl) {
                    ngModelCtrl.$setViewValue(selectedDate);
                }
                if (direction === 0) {
                    for (var row = 0; row < 6; row += 1) {
                        for (var date = 0; date < 7; date += 1) {
                            var selected = compare(selectedDate, weeks[row][date]) === 0;
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

        function onDataLoaded() {
            var events = self.eventSource,
                len = events ? events.length : 0,
                startTime = self.range.startTime,
                endTime = self.range.endTime,
                weeks =  self.weeks,
                oneDay = 86400000,
                eps = 0.001,
                row,
                date,
                hasEvent = false;

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

            var findSelected = false;
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


        function onViewRefreshed() {
            if (self.queryMode === 'local') {
                if (self.eventSource && onDataLoaded) {
                    onDataLoaded();
                }
            } else if (self.queryMode === 'remote') {
                if (onViewRefreshed) {
                    onViewRefreshed({
                        startTime: self.range.startTime,
                        endTime: self.range.endTime
                    });
                }
            }
        }


        // attach metadata to each day
        function attachDaysMetadata(days, month) {
            for ( var i = 0; i < 42; i++ ) {
                angular.extend( days[ i ], createDayMetadata( days[ i ] ), {
                    secondary: days[ i ].getMonth() !== month
                } );
            }
        }


        function createDayMetadata(day) {
            return {
                label: dateFilter(day, self.formatDay),
                headerLabel: dateFilter(day,self.formatDayHeader),
                selected: compare(day, self.currentCalendarDate) === 0,
                current: compare(day, new Date()) === 0
            };
        }


        function createDaysLabels( days ) {
            var labels = new Array(7);
            for (var j = 0; j < 7; j++) {
                labels[j] = dateFilter(days[j], self.formatDayHeader);
            }
            return labels;
        }


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


        function validateDate($viewValue) {
            var date = new Date($viewValue);
            var isValid = !isNaN(date);

            if (isValid) {
                self.currentCalendarDate = date;
            } else {
                $log.error('"ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
            }
            ngModelCtrl.$setValidity('date', isValid);

            return $viewValue;
        }


        function compare(date1, date2) {
            return (new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()) );
        }


        function compareEvent(event1, event2) {
            return (event1.startTime.getTime() - event2.startTime.getTime());
        }


        function refreshView() {
            var startDate;
            var day;
            var month;
            var year;
            var headerDate;
            var days;

            if (self.mode) {

                self.range = getRange(self.currentCalendarDate);

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


        // Split array into smaller arrays
        function split (arr, size) {
            var arrays = [];
            while (arr.length > 0) {
                arrays.push(arr.splice(0, size));
            }
            return arrays;
        }


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