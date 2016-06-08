angular.module( 'calendarDemoApp', [
    'ui.rCalendar', 'ngMaterial', 'sticky', 'tmh.dynamicLocale'
] );
angular.module( 'calendarDemoApp' ).run( appRun );
angular.module( 'calendarDemoApp' ).config( calendarConfig );
angular.module( 'calendarDemoApp' ).config( localeConfig );

localeConfig.$inject = [ 'tmhDynamicLocaleProvider' ];

function localeConfig( tmhDynamicLocaleProvider ) {
    tmhDynamicLocaleProvider.localeLocationPattern( 'https://cdnjs.cloudflare.com/ajax/libs/angular-i18n/1.5.6/angular-locale_{{locale}}.js' );
}

angular.module( 'calendarDemoApp' ).controller( 'CalendarDemoController', CalendarDemoController );

appRun.$inject = [ '$rootScope', '$mdMedia' ];

/**
 * Run phase configs
 *
 * @param {Object} $rootScope - angular $rootScope service
 * @param {Object} $mdMedia - angular-material $mdMedia service
 *
 * @returns {void}
 */
function appRun( $rootScope, $mdMedia ) {
    'use strict';
    $rootScope.$mdMedia = $mdMedia;
}

calendarConfig.$inject = [ '$mdThemingProvider' ];

/**
 * Set app configurations
 *
 * @param {Object} $mdThemingProvider - angular-material $mdThemingProvider service
 * @returns {void}
 */
function calendarConfig( $mdThemingProvider ) {
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

CalendarDemoController.$inject = [ '$log', 'tmhDynamicLocale' ];

/**
 * Demo app controller
 *
 * @param {Object} $log - angular $log service
 * @constructor
 */
function CalendarDemoController( $log, tmhDynamicLocale ) {
    'use strict';

    var i;
    var vm = this;
    var eventSources;
    var colors = new Array( 100 );

    for ( i = 0; i < colors.length; i += 1 ) {
        colors[ i ] = '#' + ( Math.random() * 0xFFFFFF << 0 ).toString( 16 );
    }

    eventSources = [
        { summary: 'SEFAZ' }, { summary: 'SEGER' }, { summary: 'SEJUS' }, { summary: 'PRODEST' }
    ];

    eventSources.forEach( function( source ) {
        source.color = colors[ Math.floor( Math.random() * ( ( colors.length - 1 ) - 0 + 1 ) ) ];
        source.items = createRandomEvents( source.summary, Math.floor( Math.random() * 500 ), source.color );
        source.etag = guid();
    } );

    vm.availableLocales = [
        {
            key: 'pt',
            name: 'Português'
        }, {
            key: 'en',
            name: 'English'
        }, {
            key: 'de',
            name: 'German'
        }, {
            key: 'fr',
            name: 'French'
        }, {
            key: 'ar',
            name: 'Arabic'
        }, {
            key: 'ja',
            name: 'Japanese'
        }, {
            key: 'ko',
            name: 'Korean'
        }, {
            key: 'zh',
            name: 'Chinese'
        }, {
            key: 'it',
            name: 'Italiano'
        }
    ];
    vm.selectedLocale = vm.availableLocales[ 0 ].key;
    vm.currentDate = new Date();
    vm.showPins = true;
    vm.showEventList = true;
    vm.queryModel = 'local';
    vm.changeLocale = changeLocale;
    vm.changeMode = changeMode;
    vm.today = today;
    vm.randomDate = randomDate;
    vm.isToday = isToday;
    vm.loadEvents = loadEvents;
    vm.onTimeSelected = onTimeSelected;
    vm.onEventSelected = onEventSelected;
    vm.changeLocale( vm.selectedLocale );

    ////////////////////////////////////////////////////////////////////////////////////////////////

    function guid() {
        function s4() {
            return Math.floor( ( 1 + Math.random() ) * 0x10000 )
                       .toString( 16 )
                       .substring( 1 );
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    function changeMode( mode ) {
        vm.mode = mode;
    }

    function today() {
        vm.currentDate = new Date();
    }

    function randomDate() {
        vm.currentDate = new Date( 2016, 5, 23 );
    }

    function isToday() {
        var today = new Date();
        var currentCalendarDate = new Date( vm.currentDate );

        today.setHours( 0, 0, 0, 0 );
        currentCalendarDate.setHours( 0, 0, 0, 0 );
        return today.getTime() === currentCalendarDate.getTime();
    }

    function loadEvents() {
        vm.eventSources = eventSources;
    }

    function onEventSelected( event ) {
        vm.event = event;
    }

    function onTimeSelected( selectedTime ) {
        $log.info( 'Selected time: ' + selectedTime );
    }

    function changeLocale( locale ) {
        tmhDynamicLocale.set( locale ).then( function() {
            vm.currentDate = new Date( vm.currentDate );
        } );
    }

    /**
     * Random events factory
     *
     * @returns {Array} - Random events
     */
    function createRandomEvents( source, numOfEvents, color ) {
        var events = [];
        var i;
        var date;
        var startDay;
        var endDay;
        var startTime;
        var endTime;
        var startMinute;
        var endMinute;

        for ( i = 0; i < numOfEvents; i += 1 ) {
            date = new Date();
            startDay = Math.floor( Math.random() * 90 ) - 25;
            endDay = Math.floor( Math.random() * 3 ) + startDay;
            startMinute = Math.floor( Math.random() * 24 * 60 );
            endMinute = Math.floor( Math.random() * 180 ) + startMinute;
            startTime = new Date( date.getFullYear(), date.getMonth(), date.getDate() + startDay, 0, date.getMinutes() + startMinute );
            endTime = new Date( date.getFullYear(), date.getMonth(), date.getDate() + endDay, 0, date.getMinutes() + endMinute );

            events.push( {
                id: guid(),
                etag: guid(),
                summary: source + ' - Event ' + i,
                startTime: startTime,
                endTime: endTime,
                color: color
            } );
        }
        return events;
    }
}
