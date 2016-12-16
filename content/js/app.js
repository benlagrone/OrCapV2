angular.module('orCapMobileApp', ['kendo.directives', 'ngRoute', 'ui.bootstrap', 'ngAnimate','ngCookies','ngTouch'])
    .controller('navController', function ($scope, $location,$window) {
        $scope.custom = true;
        $scope.collapse = "collapse";
        $scope.isActive = function (viewLocation) {
            return viewLocation === $location.path();
        };
        $scope.toggleCustom = function(link) {

            if(link!='showButton')
                $location.path('/'+link);

            $scope.$watch(function(){
                return $window.innerWidth;
            }, function(value) {
                if(value < 768){
                    $scope.custom = $scope.custom === false;
                    //console.log($scope.custom + " CUSTOM");
                    $scope.collapse = $scope.custom === false ? "collapse in": "collapse";
                }
            });
        };
        $scope.versionInfo = '1.0.0.26';
        $scope.versionInfo = "#{Version}";
        //$scope.versionInfo ='#{Octopus.Version.LastMajor}.#{Octopus.Version.LastMinor}.#{Octopus.Version.NextPatch}'

    })
    .controller('indexController', function ($scope, $route, $routeParams, $location) {
        $scope.$route = $route;
        $scope.$location = $location;
        $scope.$routeParams = $routeParams;
    })
    .controller('roomsRunningController', function ($cookies,timeServices,$animate, $scope, APIService, preferences, calendarService, chartService, gaugeService,checkLocalStorageService) {
        checkLocalStorageService.roomsrunning.checkAll();
        $scope.name = 'roomsRunningController';
        $scope.location = 'roomsrunning';
        $scope.holeSize = 20;
        $scope.tomorrow = moment()._d.getDay()<5?moment().add(1, 'days'):moment()._d.getDay()===5?moment().add(3, 'days'):moment().add('days', 2);
        $scope.day = $scope.$parent.dateRoomsRunning ? moment(Date.parse($scope.$parent.dateRoomsRunning)) : $scope.tomorrow;
        $scope.date = $cookies.get('dateRoomsRunning') || $scope.$parent.dateRoomsRunning || $scope.day.month() + 1 + '/' + $scope.day.date() + '/' + $scope.day.year();
        $cookies.put('dateRoomsRunning', $scope.date);
        $scope.$parent.dateRoomsRunning = $scope.date;
        $scope.label = {};
        $scope.label.facility = function () {
            return preferences.retrieveFromLocalStorage.global.facility() === '1010001' ? 'Main OR, ' : 'Mays OR, ';
        };
        $scope.filtersOptions = {};
        $scope.filtersOptions.serviceOptions = [];
        $scope.label.service = preferences.retrieveFromLocalStorage.global.service();
            APIService.getServices().then(function (response) {
                $scope.filtersOptions.serviceOptions = response.data;
                var allObject = {
                    title:"ALL",
                    value:"0"
                };
                $scope.filtersOptions.serviceOptions.push(allObject)
                angular.forEach($scope.filtersOptions.serviceOptions,function(value,key){
                    if(value.value===preferences.retrieveFromLocalStorage.global.service()){
                        $scope.label.service = value.title
                    }
                })
            });
        $scope.label.roboblocks = function () {
            return preferences.retrieveFromLocalStorage.roomsrunning.roboblocks() === 'true' ? ', Robo Blocks' : '';
        };
        $scope.label.booked = function () {
            return preferences.retrieveFromLocalStorage.roomsrunning.booked() === 'true' ? ', Booked' : '';
        };
        $scope.label.actual = function () {
            return preferences.retrieveFromLocalStorage.roomsrunning.actual() === 'true' ? ', Actual' : '';
        };
        $scope.label.standby = function () {
            return preferences.retrieveFromLocalStorage.roomsrunning.standby() === 'true' ? ', StandBy' : '';
        };
        $scope.label.filtersApplied = function () {
            return $scope.label.facility() + $scope.label.service + $scope.label.roboblocks() + $scope.label.booked() + $scope.label.actual() + $scope.label.standby();
        };
        $scope.OOD = '';
        $scope.topData = {};
        $scope.topData.CB = 0;
        $scope.topData.color = '#000';
        $scope.topData.SM = 0;
        $scope.topData.BC = 0;
        $scope.topData.SBBC = 0;
        $scope.availRooms = 0;
        $scope.rooms = new kendo.data.DataSource({data: []});
        $scope.roomsRunning = [];
        $scope.booked = true;
        $scope.actual = false;
        $scope.barChart = {
            title: {
                visible: false,
                position: "bottom",
                text: "Rooms Running"
            },
            categoryAxis: {
                labels: {
                    rotation: -90,
                    step: 1,
                    skip: 0,
                    font: "10px sans-serif"
                }
            },
            legend: {
                visible: false
            },
            chartArea: {
                background: "transparent"
            },
            seriesDefaults: {
                labels: {
                    visible: true,
                    background: "transparent",
                    template: "#= value#"
                },
                "overlay": {
                    "gradient": "none"
                },
            },
            //categoryAxis:{categories:"time"},
            series: [{
                color: "#23B8F1", // Blue
                type: JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.booked()) ? "column" : null,
                field: "roomCount",
                categoryField: "time",
                labels: {
                    visible: JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.booked()),
                    background: "transparent"
                }
            }, {
                color: "#529144", // Green
                type: JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.actual()) ? "column" : null,
                field: "roomCaseCount",
                categoryField: "time",
                labels: {
                    visible: JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.actual()),
                    background: "transparent"
                }
            }, {
                color: "#DA291C", // Red
                type: "line",
                field: "staffCount",
                style: "step",
                labels: {
                    visible: false,
                    background: "transparent"
                }
            }
            ],
            tooltip: {
                visible: true,
                format: "{0}"
            }
        };
        //$scope.showcal = false;
        $scope.$watchGroup(['date','showCal'], function (newVal, oldVal) {

            if (!angular.equals(newVal, oldVal)) {
                $scope.$parent.dateRoomsRunning = newVal[0];
                $scope.upDateRoomsRunning(newVal[0])
                $cookies.put('dateRoomsRunning', newVal[0]);

            }
        });
        $scope.dailyMetricsList = [
            {
                responseId: 'cap_booked',
                label: 'Capacity Booked',
                subtext: '',
                percent: true,
                icon: "orc-folder",
                class: "gauge-label",
                order: 0
            },
            {
                responseId: 'booked_case_count',
                label: 'Booked Cases',
                subtext: '',
                percent: false,
                icon: "orc-folder",
                class: "",
                order: 3
            },
            {
                responseId: 'booked_start',
                label: 'Booked Starts',
                subtext: '',
                percent: false,
                icon: "orc-folder",
                class: "",
                order: 4
            },
            {
                responseId: 'actual_case_count',
                label: 'Actual Cases',
                subtext: '',
                percent: false,
                icon: "orc-folder",
                class: "",
                order: 5
            },
            {
                responseId: 'tot_staff_mins',
                label: 'Staffed Mins',
                subtext: '',
                percent: false,
                icon: "orc-people",
                class: "",
                order: 6
            },
            {
                responseId: 'tot_booked_mins',
                label: 'Booked Mins',
                subtext: '',
                percent: false,
                icon: "orc-clock",
                class: "",
                order: 7
            },
            {
                responseId: 'actual_start_pat_in',
                label: 'On-Time Starts',
                subtext: '(Patient in Room)',
                percent: false,
                icon: "orc-clock",
                class: "",
                order: 8
            },
            {
                responseId: 'tot_actual_mins',
                label: 'Actual Mins',
                subtext: '',
                percent: false,
                icon: "orc-clock",
                class: "",
                order: 9
            },
            {
                responseId: 'tot_turnover_mins',
                label: 'Turnover Mins',
                subtext: '',
                percent: false,
                icon: "orc-clock",
                class: "",
                order: 10
            },
            {
                responseId: 'actual_percentage',
                label: 'Actual vs Staffed',
                subtext: '',
                percent: true,
                icon: "",
                class: "gauge-label",
                order: 1
            },
            {
                responseId: 'percent_pat_in',
                label: '% of On-Time Starts',
                subtext: '(Patient in Room)',
                percent: true,
                icon: "",
                class: "gauge-label",
                order: 2
            },
            {
                responseId: 'avg_pat_turnover_time',
                label: 'Avg Turnover Mins',
                subtext: '',
                percent: false,
                icon: "orc-clock",
                class: "",
                order: 11
            },
            {
                responseId: 'first_case_wasted_mins',
                label: 'On-Time Start Delay Mins',
                subtext: '',
                percent: false,
                icon: "orc-clock",
                class: "",
                order: 12
            },
            {
                responseId: '',
                label: 'SB Case Count',
                subtext: '',
                percent: false,
                icon: "orc-folder",
                class: "",
                order: 13
            }
        ];
        $scope.upDateRoomsRunning = function (reqDate) {

            APIService.getRoomsRunning($scope.date).then(function (response) {

                var dailyMetricsObject = response.data.DailyMetrics;

                if(Array.isArray(dailyMetricsObject))
                    dailyMetricsObject = dailyMetricsObject[0];
                angular.forEach(dailyMetricsObject, function (value0, key0) {
                    angular.forEach($scope.dailyMetricsList, function (value, key) {

                        if (angular.equals(value.responseId, key0)) {


                            $scope.dailyMetricsList[key].uiData = new kendo.data.DataSource({data: []});
                            //$scope.dailyMetricsList[key].uiData = $scope.dailyMetricsList[key].percent?new kendo.data.DataSource({data:[]}):false;
                            var tempData = [];
                            var graphData = {};
                            var graphDataAlt = {};

                            graphData.category = "Booked Capacity";
                            graphDataAlt.category = "UnBooked";
                            graphData.color = $scope.dailyMetricsList[key].percent ? calendarService.makeColor(value0) : "#000000";

                            graphDataAlt.color = "rgba(0,0,0,.2)";

                            graphData.value = value0;
                            graphDataAlt.value = 100 - value0;

                            tempData.push(graphData)
                            tempData.push(graphDataAlt);
                            $scope.dailyMetricsList[key].uiData.data(tempData);
                            $scope.dailyMetricsList[key].chartData = {}
                            var center;
                            var radius;
                            $scope.dailyMetricsList[key].weekDay = true;
                            $scope.dailyMetricsList[key].color = $scope.dailyMetricsList[key].percent ? calendarService.makeColor(value0) : "#000000";
                            $scope.dailyMetricsList[key].chartData = value0;
                            $scope.dailyMetricsList[key].doughnut = $scope.dailyMetricsList[key].percent ? chartService.doughnut(value0,$scope.holeSize) : false;
                            $scope.dailyMetricsList[key].gauge ={};
                            $scope.dailyMetricsList[key].gauge = $scope.dailyMetricsList[key].percent ? gaugeService.buildGauge(value0,"full","#6f487d",100) : false;
                            $scope.dailyMetricsList[key].value = $scope.dailyMetricsList[key].percent ? value0 : 0;
                        }
                    });
                });
                $scope.roomsRunning = [];
                //$scope.availableRooms = [];
                angular.forEach(response.data.RoomsRunning, function (value, key) {
                    var staffCount = {};
                    staffCount.time = value.time_interval;
                    staffCount.roomCount = value.room_count;
                    staffCount.roomCaseCount = value.room_case_count;
                    staffCount.staffCount = value.staff_count;
                    $scope.roomsRunning.push(staffCount)
                    //$scope.availableRooms.push(value.room_count)
                });

                //$scope.availRooms = Math.max.apply(Math, $scope.availableRooms);
                $scope.availRooms = response.data.TotalAvailableRooms;
                $scope.rooms.data($scope.roomsRunning)
            });

            APIService.getCalendarRapidData(Date.parse($scope.date), Date.parse($scope.date)).then(function (response, data) {
                $scope.dailyMetricsList[13].chartData = response.data[0].SB_Case_Count
                $scope.topData.SM = response.data[0].Staff_Block_Mins;
                $scope.topData.BC = response.data[0].Case_Count;
                $scope.topData.SBCC = response.data[0].SB_Case_Count;
                angular.forEach($scope.dailyMetricsList, function (value, key) {
                    if (angular.equals($scope.dailyMetricsList[key].responseId, 'cap_booked')) {
                        $scope.dailyMetricsList[key].uiData = new kendo.data.DataSource({data: []});
                        $scope.topData.CB = parseInt(response.data[0].Booked_Capacity);
                        $scope.topData.color = calendarService.makeColor(parseInt(response.data[0].Booked_Capacity),'roomsrunning');
                        var tempData = [];
                        var graphData = {};
                        var graphDataAlt = {};
                        graphData.category = "Booked Capacity";
                        graphDataAlt.category = "UnBooked";
                        graphData.color = $scope.dailyMetricsList[key].percent ? calendarService.makeColor(parseInt(response.data[0].Booked_Capacity)) : "#000000";
                        graphDataAlt.color = "rgba(0,0,0,.2)";
                        graphData.value = parseInt(response.data[0].Booked_Capacity);
                        graphDataAlt.value = 100 - parseInt(response.data[0].Booked_Capacity);
                        tempData.push(graphData)
                        tempData.push(graphDataAlt);
                        $scope.dailyMetricsList[key].uiData.data(tempData);
                        $scope.dailyMetricsList[key].chartData = {}
                        var center;
                        var radius;
                        $scope.dailyMetricsList[key].weekDay = true;
                        $scope.dailyMetricsList[key].color = $scope.dailyMetricsList[key].percent ? calendarService.makeColor(parseInt(response.data[0].Booked_Capacity)) : "#000000";
                        $scope.dailyMetricsList[key].chartData = parseInt(response.data[0].Booked_Capacity);
                        $scope.dailyMetricsList[key].doughnut = $scope.dailyMetricsList[key].percent ? chartService.doughnut(parseInt(response.data[0].Booked_Capacity),$scope.holeSize) : false;
                        var thresholds=[{value: 79, color:'#529144'},{value: 85, color:'#F9CA1F'},{value: 101, color:'#DA291C'}];
                        $scope.dailyMetricsList[key].gauge =  $scope.dailyMetricsList[key].percent ? gaugeService.addGaugeMarkers([gaugeService.buildGauge(parseInt(response.data[0].Booked_Capacity),"full","#8a6298",100)],thresholds)[0] : false;
                        $scope.dailyMetricsList[key].value = $scope.dailyMetricsList[key].percent ? parseInt(response.data[0].Booked_Capacity) : 0;
                    }
                });
            })
        };
        $scope.upDateRoomsRunning();

    })
    .controller('roomsRunningFilters', function ($scope, preferences,APIService) {

        $scope.date = $scope.$parent.dateRoomsRunning;
        $scope.location = 'roomsrunningfilters';
        $scope.filters = {};
        $scope.filtersOptions = {};
        $scope.filters.facility = preferences.retrieveFromLocalStorage.global.facility();
        $scope.filtersOptions.facilitiesOptions = [];
        $scope.filters.service = preferences.retrieveFromLocalStorage.global.service();
        $scope.filtersOptions.serviceOptions = [];
        $scope.filters.roboblocks = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.roboblocks());
        $scope.filters.booked = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.booked());
        $scope.filters.actual = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.actual());
        $scope.filters.standby = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.standby());

        $scope.$watchGroup(['filters.booked', 'filters.actual', 'filters.service', 'filters.roboblocks', 'filters.standby', 'filters.facility'], function (newVal, oldVal) {
            if (!angular.equals(newVal, oldVal)) {
                angular.forEach($scope.filters, function (value, key) {
                    preferences.updateLocalStorageItem(key, value)
                })
            }
        });


        APIService.getLocations().then(function (response) {
            $scope.filtersOptions.facilitiesOptions = response.data;
        });

        APIService.getServices().then(function (response) {
            $scope.filtersOptions.serviceOptions = response.data;
            var allObject = {
                title:"ALL",
                value:"0"
            };
            $scope.filtersOptions.serviceOptions.push(allObject)
        });

    })
    .controller('orTrackingFilters', function ($scope, preferences,APIService) {
        $scope.location = 'ortrackingfilters';
        $scope.filters = {};
        $scope.filtersOptions = {};
        $scope.filters.facility = preferences.retrieveFromLocalStorage.global.facility();
        $scope.filtersOptions.facilitiesOptions = [];
        $scope.filters.service = preferences.retrieveFromLocalStorage.global.service();
        $scope.filtersOptions.serviceOptions = [];

        $scope.filters.booked = JSON.parse(preferences.retrieveFromLocalStorage.ortracking.booked());

        $scope.filters.actual = JSON.parse(preferences.retrieveFromLocalStorage.ortracking.actual());


        $scope.filters.room = preferences.retrieveFromLocalStorage.ortracking.room();
        $scope.filtersOptions.roomOptions = [];

        //console.log(preferences.retrieveFromLocalStorage.ortracking.resolution())
        $scope.filters.resolution = preferences.retrieveFromLocalStorage.ortracking.resolution();
        $scope.filtersOptions.resolutionOptions = [];

        $scope.filters.onTimeThreshold = preferences.retrieveFromLocalStorage.ortracking.onTimeThreshold();
        $scope.filtersOptions.onTimeThresholdOptions = [];

        $scope.roomsRunningParamsX = function () {
        };

        $scope.$watchGroup(['filters.facility', 'filters.service', 'filters.booked', 'filters.actual', 'filters.room', 'filters.resolution', 'filters.onTimeThreshold'], function (newVal, oldVal) {
            //console.log(newVal)
            if (!angular.equals(newVal, oldVal)) {
                angular.forEach($scope.filters, function (value, key) {
                    preferences.updateLocalStorageItem(key, value)
                })
            }

        });

        APIService.getLocations().then(function (response) {
            $scope.filtersOptions.facilitiesOptions = response.data;
        });

        APIService.getRooms().then(function (response) {
            $scope.filtersOptions.roomOptions = response.data;
            var allObject = {
                description:"ALL",
                id:""
            }
            $scope.filtersOptions.roomOptions.push(allObject)
        });

        APIService.getServices().then(function (response) {
            $scope.filtersOptions.serviceOptions = response.data;
            var allObject = {
                title:"ALL",
                value:"0"
            }
            $scope.filtersOptions.serviceOptions.push(allObject)
        });
        APIService.getSelects().then(function (response) {
            console.log(response.data.selectgroups)
            //$scope.filtersOptions.facilitiesOptions = response.data.selectgroups.facilitiesOptions;
            //$scope.filtersOptions.serviceOptions = response.data.selectgroups.serviceOptions;
            //$scope.filtersOptions.roomOptions = response.data.selectgroups.roomOptions;
            $scope.filtersOptions.resolutionOptions = response.data.selectgroups.resolutionOptions;
            $scope.filtersOptions.onTimeThresholdOptions = response.data.selectgroups.onTimeThresholdOptions;
        });
    })
    .controller('orTrackingController', function ($scope, $route, $routeParams, $location, APIService, preferences, $uibModal, gaugeService,$cookies,chartService,checkLocalStorageService) {

        checkLocalStorageService.ortracking.checkAll();
        $scope.location = 'ortracking';
        $scope.label = {};
        $scope.label.facility = function () {
            return preferences.retrieveFromLocalStorage.global.facility() === '1010001' ? 'Main OR, ' : 'Mays OR, ';
        };


        $scope.filtersOptions = {};
        $scope.filtersOptions.serviceOptions = [];
        $scope.label.service = preferences.retrieveFromLocalStorage.global.service();
        APIService.getServices().then(function (response) {
            $scope.filtersOptions.serviceOptions = response.data;
            var allObject = {
                title:"ALL",
                value:"0"
            };
            $scope.filtersOptions.serviceOptions.push(allObject)
            angular.forEach($scope.filtersOptions.serviceOptions,function(value,key){
                if(value.value===preferences.retrieveFromLocalStorage.global.service()){
                    $scope.label.service = value.title
                }
            })
        });
        $scope.label.booked = function () {
            return preferences.retrieveFromLocalStorage.ortracking.booked() === 'true' ? ', Booked, ' : '';
        };
        $scope.label.actual = function () {
            return preferences.retrieveFromLocalStorage.ortracking.actual() === 'true' ? ', Actual, ' : '';
        };
        $scope.label.room = preferences.retrieveFromLocalStorage.ortracking.room()
        APIService.getRooms().then(function (response) {
            $scope.filtersOptions.roomsOptions = response.data;
            var allObject = {
                description:"ALL",
                id:"0"
            };
            $scope.filtersOptions.roomsOptions.push(allObject);
            angular.forEach($scope.filtersOptions.roomsOptions,function(value,key){
                if(value.description===preferences.retrieveFromLocalStorage.ortracking.room()){
                    $scope.label.room = value.title
                } else if (preferences.retrieveFromLocalStorage.ortracking.room() === ''){
                    $scope.label.room = 'ALL';
                }
            })
        });
        $scope.label.resolution = function () {
            return ', ' + preferences.retrieveFromLocalStorage.ortracking.resolution();
        };
        $scope.label.onTimeThreshold = function () {
            return ', ' + preferences.retrieveFromLocalStorage.ortracking.onTimeThreshold();
        };
        $scope.label.filtersApplied = function () {
            return $scope.label.facility() + $scope.label.service + $scope.label.booked() + $scope.label.actual() + $scope.label.room + $scope.label.resolution() + $scope.label.onTimeThreshold();
        };
        //initialize variables
        $scope.oRTrack = new kendo.data.DataSource({
            data: [],
            firstCase: [],
            dailyMetrics: []
        });
        //$scope.day = moment();
        //$scope.date = $scope.day.month() + 1 + '/' + $scope.day.date() + '/' + $scope.day.year();
        $scope.day = $scope.$parent.dateORTracking ? moment(Date.parse($scope.$parent.dateORTracking)) : moment();

        $scope.date = $cookies.get('dateORTracking') ||$scope.$parent.dateORTracking || $scope.day.month()+1 + '/' + $scope.day.date() + '/' + $scope.day.year();
        //$scope.date = $cookies.get('dateRoomsRunning') || $scope.$parent.dateRoomsRunning || $scope.day.month() + 1 + '/' + $scope.day.date() + '/' + $scope.day.year();
        $scope.$parent.dateORTracking = $scope.date;

        $scope.name = "orTrackingController";
        $scope.params = $routeParams;
        $scope.maxbookings = 1;
        $scope.items = {DelaySummaryDaily: []};
        preferences.retrieveFromLocalStorage.ortracking.booked();
        preferences.retrieveFromLocalStorage.ortracking.actual();

        // set chart colors, actual/booking-prepost represent setup/teardown time
        // proc indicates procedure time
        var actualprepost = "#F9CA1F"; // Yellow
        var bookingprepost = "#DA291C"; // Red
        var actualproc = "#529144"; // Green
        var bookingproc = "#529144"; // Green

        $scope.booked = true;
        $scope.actual = true;

        var maxbookings = 0;
        var maxactuals = 0;
         // controls graph max  time shown (needs to be variable)

        $scope.upDateORTracking = function () {
            APIService.getORTracking($scope.date).then(function (response) {
                var maxtime = 12;
                $scope.oRTracking = [];
                $scope.items.DelaySummaryDaily = response.data.DelaySummaryDaily;
                function parseStartTime(rawstarttime) {
                    //var start = rawstarttime.replace("T", " ");
                    //start = start.replace("-", "/");
                    //start = start.replace("-", "/");
                    var start = moment(rawstarttime, moment.ISO_8601)._d;

                    var starth = new Date(start).getHours(), startmin = new Date(start).getMinutes();
                    //console.log(new Date(start).getDate(),new Date($scope.date).getDate());
                    if (new Date(start).getDate() !== new Date($scope.date).getDate())
                    starth += 12;
                    offset = (starth * 60) + startmin; // Offset so the chart always starts at 6 AM
                    return offset
                }

                function buildBookings(maxbookings, maxactuals) {
                    //maxbookings=0;
                    for (var i = 0; i < maxbookings; i++) {

                        var bookings = [{
                            stack: "Booking",
                            type: "bar",
                            field: "booking.procStart[" + i.toString() + "]",
                            tooltip: {
                                visible: true,
                                //format: "Procedure Start: {0} hrs, Booked",
                                template: "Booked: <br/> Room: #=category# <br/>Procedure Start: #=Math.round(value*60)# Mins<br/>"
                            },
                            opacity: 0
                            //categoryField: "room"
                        }, {
                            stack: "Booking",
                            type: "bar",
                            field: "booking.setupMins[" + i.toString() + "]",
                            tooltip: {
                                visible: true,
                                //format: "Setup Time: {0} hrs, Booked",
                                template: "Booked: <br/> Room: #=category# <br/>Setup: #=Math.round(value*60)# Mins <br/>"
                            },
                            border: {
                                width: .5,
                                color: "black"
                            },
                            color: bookingprepost
                        }, {
                            stack: "Booking",
                            type: "bar",
                            field: "booking.procLength[" + i.toString() + "]",
                            tooltip: {
                                //fixed
                                visible: true,
                                //format: "Procedure Length: {0} hrs, Booked"
                                template: "Booked: <br/> Room: #=category# <br/>Procedure Length: #=Math.round(value*60)# Mins <br/>"

                            },
                            border: {
                                width: .5,
                                color: "black"
                            },
                            color: bookingproc
                            //categoryField: "room"
                        }, {
                            stack: "Booking",
                            type: "bar",
                            field: "booking.tearDownMins[" + i.toString() + "]",
                            tooltip: {
                                visible: true,
                                //format: "Tear Down Time: {0} hrs, Booked"
                                template: "Booked: <br/> Room: #=category# <br/>Tear Down: #=Math.round(value*60)# Mins <br/>"
                            },
                            border: {
                                width: .5,
                                color: "black"
                            },
                            color: bookingprepost
                            //categoryField: "room"
                        }];


                        angular.forEach(bookings, function (booking) {
                            $scope.barChart.series.push(booking);
                        });

                    }
                    for (var i = 0; i < maxactuals; i++) {
                        var actuals = [{
                            stack: "Actuals",
                            type: "bar",
                            field: "actuals.procStart[" + i.toString() + "]",
                            opacity: 0
                        //categoryField: "room"
                        },
                        {
                                stack: "Actuals",
                                type: "bar",
                                field: "actuals.setupMins.value[" + i.toString() + "]",
                                tooltip: {
                                    visible: true,
                                    //format: "Setup Time: {0} hrs, Actual"
                                    template: "Actual: <br/> " +
                                    "Room: #=category# <br/>" +
                                    "Setup: #=Math.round(value*60)# Mins <br/>" +
                                    "Case Type: #=dataItem.actuals.setupMins.caseType[" + i.toString() + "]# <br/>" +
                                    "Delay Reasons: <br/>" +
                                    "#=dataItem.actuals.setupMins.delayReasons[" + i.toString() + "]#"
                                },
                                border: {
                                    width: .5,
                                    color: "black"
                                },
                                color: actualprepost
                            }, {
                                stack: "Actuals",
                                type: "bar",
                                field: "actuals.procLength[" + i.toString() + "]",
                                tooltip: {
                                    visible: true,
                                    //format: "Procedure Length: {0} hrs, Actual"
                                    template: "Actual: <br/> Room: #=category# <br/>Procedure Length: #=Math.round(value*60)# Mins <br/>"
                                },
                                border: {
                                    width: .5,
                                    color: "black"
                                },
                                color: actualproc
                                //categoryField: "room"
                            }, {
                                stack: "Actuals",
                                type: "bar",
                                field: "actuals.tearDownMins[" + i.toString() + "]",
                                tooltip: {
                                    visible: true,
                                    //format: "Tear Down Time: {0} hrs, Actual"
                                    template: "Actual: <br/> Room: #=category# <br/>Tear Down: #=Math.round(value*60)# Mins <br/>"
                                },
                                border: {
                                    width: .5,
                                    color: "black"
                                },
                                color: actualprepost
                                //categoryField: "room"
                            }];
                        if (i > 0) {
                            actuals[0] = {
                                stack: "Actuals",
                                type: "bar",
                                field: "actuals.patientTurn[" + i.toString() + "]",
                                opacity: 1,
                                tooltip: {
                                    visible: true,
                                    //format: "Turnover Time: {0} hrs, Actual"
                                    template: "Actual: <br/> Room: #=category# <br/>Turnover Time: #=Math.round(value*60)# Mins <br/>"
                                },
                                color: "#ffffff",
                                border: {
                                    width: .5,
                                    color: "black"
                                }
                                //categoryField: "room"
                            };
                        }

                            actuals.push({
                                stack: "Actuals",
                                type: "bar",
                                field: "actuals.inProgress[" + i.toString() + "]",
                                //opacity: 1,
                                tooltip: {
                                    visible: false,
                                    format: "Currently In Progress"
                                },
                                //color: actualproc,
                                border: {
                                    width: .1,
                                    color: "black"
                                },
                                visual: function (e) {
                                    var origin = e.rect.origin;
                                    var center = e.rect.center();
                                    var bottomRight = e.rect.bottomRight();
                                    var bottomLeft = e.rect.bottomLeft();
                                    var topLeft = e.rect.topLeft();
                                    //console.log("ORIGIN", origin, "CENTER", center, "BRIGHT", bottomRight, "BLEFT", bottomLeft, "E", e);
                                    var color = "#000000";
                                    var opacity = 1;
                                    var inProgress = false;
                                    for (var j = 0; j < e.dataItem.actuals.inProgress.length; j++) {

                                        if (e.dataItem.actuals.inProgress[j] == 1) {
                                            //console.log(j);
                                            inProgress = true;
                                            color = checkProgress(j,color);
                                            //switch (j) {
                                            //    case 0:
                                            //        color = actuals[1].color;
                                            //        break;
                                            //    case 1:
                                            //        color = actuals[2].color;
                                            //        break;
                                            //    case 2:
                                            //        color = actuals[3].color;
                                            //        break;
                                            //}
                                            break;
                                        }
                                    }
                                    // i represents the room, j represents the specific per patient booking we are iterating over
                                    function checkProgress(j,color){
                                        color = actuals[3].color;
                                        //console.log(e.dataItem.actuals);
                                         if (e.dataItem.actuals.tearDownMins[j] == 0) {
                                             color = actuals[2].color;
                                             //console.log("tear", j);
                                             if (e.dataItem.actuals.procLength[j] == 0) {
                                                 color = actuals[1].color;
                                                 //console.log("proclength",j);
                                                 if (e.dataItem.actuals.setupMins[j] == 0) {
                                                     color = "#00000";
                                                     //console.log("setupMins",j);
                                                 }
                                             }
                                         }
                                        return color;
                                    }
                                    if (inProgress) {

                                        //if (color == "#000000") opacity = 0;
                                        var path = new kendo.drawing.Path({
                                            fill: {
                                                color: color
                                            },
                                            stroke: {
                                                color: "black",
                                                width: 0,
                                                opacity: opacity
                                            }
                                        })
                                            .moveTo(origin.x, origin.y)
                                            .lineTo(bottomLeft.x, bottomLeft.y)
                                            .lineTo(center.x, center.y)
                                            .close();

                                    }
                                    else {
                                        var path = new kendo.drawing.Path({
                                            visible: false,
                                            stroke: {
                                                opacity: 0
                                            }
                                        });
                                        path.d = "";
                                    }
                                    return path;
                                }

                                //categoryField: "room"

                            });

                        angular.forEach(actuals, function (actual, key) {

                            $scope.barChart.series.push(actual);

                        });
                    }

                    $scope.barChart.valueAxis[0].plotBands = [
                        {
                            from: moment().hour() + (moment().minute() / 60),
                            to: moment().hour() + (moment().minute() / 60) + .1,
                            color: "#DA291C" // Red
                        }
                    ];
                }

                // Find the maximum size of the array for the kendo data... Give maxbookings/maxactuals the correct values
                angular.forEach(response.data.Rooms, function (orroom) {
                    if (orroom.Bookings.length > maxbookings) {
                        maxbookings = orroom.Bookings.length;
                    }
                    if (orroom.Actuals.length > maxactuals) {
                        maxactuals = orroom.Actuals.length;
                    }
                });


                if (response.data.Rooms.length  > 0 )
                {   var divisor =2;
                    if(response.data.Rooms[0].Bookings.length > 0 && response.data.Rooms[0].Actuals.length > 0)
                    {
                        divisor =2;
                    } else {
                        divisor = 3.4;
                    }

                    var numofrooms = response.data.Rooms.length;
                }
                else {
                    var divisor = 2;
                    var numofrooms = 1;
                    $scope.oRTracking.push(
                    {
                    actuals: {
                    inProgress: 0,
                    patientTurn: [1],
                    procLength: [1],
                    procStart: [1],
                    setupMins: {value: [1], caseType: [""], delayReasons: [""]},
                    tearDownMins: [1]},

                    booking: {
                    inProgress: 0,
                    patientTurn: [1],
                    procLength: [1],
                    procStart: [1],
                    setupMins: [1],
                    tearDownMins: [1],
                    },room: "Room"});
                }
                var height = (95*(numofrooms-1))/divisor+125;
                if (response.data.Rooms.length < 1){
                    height = 400;
                }
                function createLabel(){
                    return "#=  kendo.format('{0}', moment({hour: value > 24 ? value-24 : value, minute: value%1 >0 ? value%1 > .25 ? value%1 > .5 ? 45 : 30: 15: 0 }).format('H:mm'))#"
                     //return "#=  kendo.format('{0:HH:MM}', new Date((value+6.5)*60*60*1000))#"
                }
                function createGridlines(){
                    return parseInt(preferences.retrieveFromLocalStorage.ortracking.resolution())/60;
                }
                $scope.barChart = {
                    title: {
                        visible: false,
                        position: "bottom",
                        text: "OR Tracking"
                    },
                    legend: {
                        visible: false
                    },
                    seriesDefaults: {
                        labels: {
                            visible: false,
                            background: "transparent",
                            template: "#= value"
                        },
                        overlay: {
                            "gradient": "none"
                        },
                        gap:1,
                        spacing:.4
                    },
                    chartArea: {
                        background: "transparent",
                        height:height
                    },
                    series: [],
                    categoryAxis: [{
                        field: "room", axisCrossingValue: [0, 100],
                        labels: {
                            rotation: -45,
                            font: "10px sans-serif"
                        }
                    }],
                    valueAxis: [{
                        labels: {
                            template: createLabel(),
                            //mirror: true,
                            rotation: -90,
                            font: "10px sans-serif"
                        },
                        min: 6,
                        max: maxtime,
                        majorUnit: createGridlines(),
                        minorGridLines: {
                            step:createGridlines(),
                            visible: true
                        },
                        majorGridLines: {
                            step:createGridlines(),
                            visible: true
                        }
                    }, {
                        labels: {
                            template: createLabel(),
                            //mirror: true,
                            rotation: -90,
                            font: "10px sans-serif"
                        },
                        min: 6,
                        max: maxtime,
                        majorUnit:createGridlines(),
                        majorGridLines: {
                            step:createGridlines(),
                            visible: true
                        },
                        minorGridLines: {
                            step:createGridlines(),
                            visible: true
                        }
                        //axisCrossingValues: [0, 100]
                    }],
                    tooltip: {
                        visible: true,
                        format: "{0} Hrs"
                    }
                };

                if (response.data.Rooms.length  < 1 )
                $scope.barChart.series.push({
                stack: "Booking",
                type: "bar",
                field: "booking.procStart[0]",
                tooltip: {
                    visible: true,
                    //format: "Procedure Start: {0} hrs, Booked",
                    template: "Booked: <br/> Room: #=category# <br/>Procedure Start: #=Math.round(value*60)# Mins<br/>"
                }});

                // init bar chart options
                buildBookings(maxbookings, maxactuals);

                var responsearray = response.data.Rooms.reverse();

                angular.forEach(responsearray, function (orroom, key) {
                    var trackRoom = {
                        booking: {setupMins: [], tearDownMins: [], procLength: [], procStart: [], patientTurn: [], inProgress: [], caseType: [], delayReasons: []},
                        actuals: {setupMins: {value:[], caseType: [], delayReasons: []}, tearDownMins: [], procLength: [], procStart: [], patientTurn: [], inProgress: [], caseType: [], delayReasons: []}
                    };
                    trackRoom.room = orroom.Room;

                    //Add data to trackRoom.actual
                    for (var i = 0; i < maxactuals; i++) {
                        if (orroom.Actuals[i] != undefined) {
                            trackRoom.actuals.setupMins.caseType[i] =  orroom.Actuals[i].CaseType != null ? orroom.Actuals[i].CaseType : "";
                            trackRoom.actuals.setupMins.delayReasons[i] = orroom.Actuals[i].DelayReasons != null ? orroom.Actuals[i].DelayReasons : "";
                            trackRoom.actuals.setupMins.value[i] = Math.floor(orroom.Actuals[i].SetupMins / 60 * 100) / 100; // Hard coded booking needs to be variable
                            trackRoom.actuals.tearDownMins[i] = Math.floor(orroom.Actuals[i].TearDownMins / 60 * 100) / 100;
                            trackRoom.actuals.procLength[i] = Math.floor(orroom.Actuals[i].ProcedureLength / 60 * 100) / 100;
                            trackRoom.actuals.procStart[i] = Math.floor(parseStartTime(orroom.Actuals[i].PatientIn) / 60 * 100) / 100;
                            trackRoom.actuals.patientTurn[i] = Math.floor(orroom.Actuals[i].PatientTurnoverTime / 60 * 100) / 100;
                            trackRoom.actuals.inProgress[i] = (i == orroom.Actuals.length -1 && checkInProgress(i))  ? 1: 0;
                            function checkInProgress (i) {
                                var inprogress = false;
                                if (orroom.Actuals[i].PatientOut == "1900-01-01T00:00:00") {
                                    inprogress= true;
                                    if (orroom.Actuals[i].TearDownMins == 0) {

                                    }
                                    if (orroom.Actuals[i].ProcedureLength == 0) {
                                        inprogress = true;
                                    }
                                }
                                return inprogress;
                            }

                            // Get delayReasons for each Room
                            if(orroom.Actuals.length-1 == i)
                            {
                                //console.log("MAXTIME", maxtime, Math.ceil(parseStartTime(orroom.Actuals[i].PatientOut) / 60),orroom.Actuals[i].PatientOut,i,orroom.Actuals.length-1);
                            if (parseStartTime(orroom.Actuals[i].PatientOut) / 60 > maxtime) {
                                maxtime = Math.ceil(parseStartTime(orroom.Actuals[i].PatientOut) / 60);
                            }
                            }

                        }
                        else
                        {
                            trackRoom.actuals.setupMins.value[i] = 0;
                            trackRoom.actuals.setupMins.caseType[i]="";
                            trackRoom.actuals.setupMins.delayReasons[i]="";
                            trackRoom.actuals.tearDownMins[i] = 0;
                            trackRoom.actuals.procLength[i] = 0;
                            trackRoom.actuals.procStart[i] = 0;
                            trackRoom.actuals.patientTurn[i] = 0;
                            trackRoom.actuals.inProgress[i] = 0;
                        }
                    }
                    //Add data to trackRoom.booking
                    for (var i = 0; i < maxbookings; i++) {

                        //Parse Start time remove T, calculate minutes offset
                        if (orroom.Bookings[i] != undefined) {
                            if (i < 1) {
                                var offset = parseStartTime(orroom.Bookings[i].PatientIn);

                            }
                            else {
                                var offset = parseStartTime(orroom.Bookings[i].PatientIn) - parseStartTime(orroom.Bookings[i - 1].PatientOut);
                            }
                        } else {
                            var offset = 0;
                        }

                        // Add data to trackRoom.booking
                        trackRoom.booking.setupMins[i] = orroom.Bookings[i]  != undefined ? Math.floor(orroom.Bookings[i].SetupMins / 60 * 100) / 100 : 0; // Hard coded booking needs to be variable
                        trackRoom.booking.tearDownMins[i] = orroom.Bookings[i] != undefined ? Math.floor(orroom.Bookings[i].TearDownMins / 60 * 100) / 100 : 0;
                        trackRoom.booking.procLength[i] = orroom.Bookings[i] != undefined ? Math.floor(orroom.Bookings[i].ProcedureLength / 60 * 100) / 100 : 0;
                        trackRoom.booking.procStart[i] = orroom.Bookings[i] != undefined ? Math.floor(offset / 60 * 100) / 100 : 0;
                        trackRoom.booking.patientTurn[i] = orroom.Bookings[i] != undefined ? Math.floor(orroom.Bookings[i].PatientTurnoverTime / 60 * 100) / 100 : 0;
                        if (orroom.Bookings[i] != undefined)
                        {trackRoom.booking.inProgress[i] = i == orroom.Bookings.length-1 ? 1 : 0;} else {trackRoom.booking.inProgress[i] = 0;}
                        if (orroom.Bookings[i] != undefined) {

                            if(orroom.Bookings.length-1 == i)
                            {
                                //console.log("MAXTIME", maxtime, Math.ceil(parseStartTime(orroom.Bookings[i].PatientOut) / 60),orroom.Bookings[i].PatientOut,i,orroom.Bookings.length-1);
                            if (parseStartTime(orroom.Bookings[i].PatientOut) / 60 > maxtime) {
                                maxtime = Math.ceil(parseStartTime(orroom.Bookings[i].PatientOut) / 60);
                            }
                        }
                    }
                    }


                    $scope.oRTracking.push(trackRoom);

                });

                $scope.maxbookings = maxbookings;
                $scope.maxactuals = maxactuals;

                $scope.barChart.valueAxis[0].max = maxtime;
                $scope.barChart.valueAxis[1].max = maxtime;

                //Shorten response.data;
                var DailyMetrics = response.data.DailyMetrics;
                var FirstCase = response.data.FirstCaseOnTime;

                //put in variables
                var firstcase = [
                    {
                        averagePatientTurnoverTime: chartService.checkNumberNaN(FirstCase.AveragePatientTurnoverTime),
                        patientInRoom: {
                            //actualStarts: checkNumber(FirstCase.PatientInRoom.ActualStarts),
                            actualStarts: chartService.checkNumberNaN(FirstCase.PatientInRoom.ActualStarts),
                            bookedStarts: chartService.checkNumberNaN(FirstCase.PatientInRoom.BookedStarts),
                            percent: chartService.checkNumberNaN(Math.round(FirstCase.PatientInRoom.ActualStarts / FirstCase.PatientInRoom.BookedStarts * 100))
                        },
                        procedureStart: {
                            actualStarts: chartService.checkNumberNaN(FirstCase.ProcedureStart.ActualStarts),
                            bookedStarts: chartService.checkNumberNaN(FirstCase.ProcedureStart.BookedStarts),
                            percent: chartService.checkNumberNaN(Math.round(FirstCase.ProcedureStart.ActualStarts / FirstCase.ProcedureStart.BookedStarts * 100))
                        }
                    }];
                var dailyMetrics = [
                    {
                        actualCases: {value: chartService.checkNumberNaN(DailyMetrics.ActualCases), icon: "orc orc-folder"},
                        actualPercentage: {

                            value:response.data.DailyMetrics.ActualPercentage,
                            icon: ""
                        },
                        bookedCases: {value: chartService.checkNumberNaN(DailyMetrics.BookedCases), icon: "orc orc-folder"},
                        staffMins: {value: chartService.checkNumberNaN(DailyMetrics.StaffMins), icon: "orc orc-people"},
                        totActualMins: {value: chartService.checkNumberNaN(DailyMetrics.TotActualMins), icon: "orc orc-clock"},
                        totBookedMins: {value: chartService.checkNumberNaN(DailyMetrics.TotBookedMins), icon: "orc orc-clock"},
                        totTurnoverMins: {value: chartService.checkNumberNaN(DailyMetrics.TotTurnoverMins), icon: "orc orc-clock"},
                        wastedMins: {value: chartService.checkNumberNaN(DailyMetrics.WastedMins), icon: "orc orc-clock"}
                    }];

                //Daily Metrics & First Case
                $scope.oRTrack.dailyMetrics = dailyMetrics;
                $scope.oRTrack.firstCase = firstcase;

                firstthresholds=[{value: 40, color:'#DA291C'},{value: 70, color:'#F9CA1F'},{value: 101, color:'#529144'}];
                secondthresholds=[{value: 30, color:'#529144'},{value: 60, color:'#F9CA1F'},{value: 101, color:'#DA291C'}];

                // Format Gauges
                $scope.gauges=[];

                $scope.gauges = [
                    gaugeService.addGaugeMarkers([gaugeService.buildGauge($scope.oRTrack.firstCase[0].patientInRoom.percent,"half")],firstthresholds)[0],
                    gaugeService.addGaugeMarkers([gaugeService.buildGauge($scope.oRTrack.firstCase[0].procedureStart.percent,"half")],firstthresholds)[0],
                    gaugeService.addGaugeMarkers([gaugeService.buildGauge($scope.oRTrack.firstCase[0].averagePatientTurnoverTime,"half","#ffffff",90)],secondthresholds)[0],
                    gaugeService.buildGauge($scope.oRTrack.dailyMetrics[0].actualPercentage.value,"full")
                ];
                $scope.gaugevalues = [$scope.oRTrack.firstCase[0].patientInRoom.percent,$scope.oRTrack.firstCase[0].procedureStart.percent,
                $scope.oRTrack.firstCase[0].averagePatientTurnoverTime,$scope.oRTrack.dailyMetrics[0].actualPercentage.value ];
                //console.log('WATCH THE CHANGE', $scope.gauges, $scope.gaugevalues);
                $scope.oRTrack.data($scope.oRTracking);
            });
        };

        $scope.animationsEnabled = true;

        $scope.open = function (size) {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'myModalContent.html',
                controller: 'ModalInstanceCtrl',
                size: size,
                resolve: {
                    items: function () {
                        return $scope.items;
                    }
                }
            });
            modalInstance.result.then(function (selectedItem) {
                $scope.selected = selectedItem;
            });
        };

        $scope.toggleAnimation = function () {
            $scope.animationsEnabled = !$scope.animationsEnabled;
        };

        $scope.$watchGroup(['date'], function (newVal, oldVal) {
            if (!angular.equals(newVal, oldVal)) {
                $scope.upDateORTracking(newVal[0], newVal[1])
                $scope.$parent.dateORTracking = $scope.date;
                //localStorage.setItem('orTrackingDate', newVal[0]);
                $cookies.put('dateORTracking', newVal[0]);
            }
        });

        $scope.upDateORTracking();
        console.log($scope)
    })
    .controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, items) {

        $scope.items = items;
        $scope.selected = {
            item: $scope.items[0]
        };

        $scope.ok = function () {
            $uibModalInstance.close($scope.selected.item);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    })
    .directive('pullrefresh',function($window,displayModeService){
        return function (scope, element, attr) {
            scope.drag = true;
            scope.pullClass = false;
            scope.pullNumber = 0;
            scope.foob = navigator.appName;
            scope.bar = navigator.appCodeName;
            scope.goo = navigator.product;
            var hammertime = new Hammer(document.body);

            hammertime.on('pan', function (ev) {
                scope.pullNumber = ev.deltaY;
                if(ev.deltaY>0){
                    if (window.pageYOffset < 5) {
                        if (ev.isFinal) {
                            if (ev.deltaY >= 200 && scope.pullClass === true) {
                                scope.pullClass = false;
                                scope.$apply();
                                location.reload();
                                return;
                            }
                            scope.pullClass = false;
                            scope.$apply();
                        } else {
                            document.getElementById('refreshTab').style.height = ev.deltaY/6 + 'px';
                            scope.pullClass = true;
                            scope.$apply();
                            return;
                        }
                        scope.pullClass = false;
                        scope.$apply();
                        return;
                    }
                } else {

                    scope.pullClass = false;
                    scope.$apply();
                }
            });

            $window.scrollTo(0, 0);
        }
    })
    .directive('navelement', function ($route, $routeParams, $location, preferences, displayModeService, $window) {
        return {
            restrict: "A",
            link: function (scope, element, attrs) {

                scope.route = $route;
                scope.location = $location;
                scope.routeParams = $routeParams;
                scope.filterLink = '/#' + $location.$$path + 'filters';
                scope.filterBackLink = '/#' + $location.$$path.split('filters')[0];
                scope.showFilter = $location.$$path.split('filters').length > 1 ? true : false;
                scope.facility = function () {
                    var facility = preferences.retrieveFromLocalStorage.global.facility();
                    var facName;
                    switch (facility) {
                        case '1':
                            facName = 'Main OR';
                            break;
                        case '2' :
                            facName = 'ACB OR';
                            break;
                        default:
                            facName = 'OR Cap';
                    }
                    return facName;
                };

                scope.facilityID = function () {
                    var facility = preferences.retrieveFromLocalStorage.global.facility();
                    var facName;
                    switch (facility) {
                        case '1':
                            facName = 'main';
                            break;
                        case '2' :
                            facName = 'acb';
                            break;
                        default:
                            facName = 'or';
                    }
                    return facName;
                };
                scope.label = {};
                scope.label.facility = scope.facility();
                scope.label.facilityID = scope.facilityID();
                scope.label.title = $route.routes[$location.$$path]?$route.routes[$location.$$path].title:"Rooms Running";
                scope.label.agentName = displayModeService.returnAgentName();

                scope.$root.$on("$locationChangeStart", function (event, next, current) {
                    scope.label.facilityID = scope.facilityID();
                    scope.filterLink = '/#' + scope.location.$$path + 'filters';
                    scope.label.facility = scope.facility();
                    scope.label.title = $route.routes[$location.$$path]?$route.routes[$location.$$path].title:"Rooms Running";
                    scope.showFilter = $location.$$path.split('filters').length > 1 ? true : false;
                    scope.filterBackLink = '/#' + $location.$$path.split('filters')[0];
                });
                scope.$watchGroup(['$location', 'label.landscape','calOpen'], function (newValue, oldValue) {
                    scope.showFilter = $location.$$path.split('filters').length > 1 ? true : false;

                }, true);

                scope.landscapemode = displayModeService.detectOrientation() ? 'landscapemode' : 'portraitmode';

                scope.landscapemodehide = function(){
                    return displayModeService.detectOrientation();
                };

                var w = angular.element($window);

                scope.$watch(function () {
                    return {
                        //'h': w.height(),
                        'w': w.width()
                    };
                }, function (newValue, oldValue) {
                    //scope.windowHeight = newValue.h;
                    scope.windowWidth = newValue.w;


                }, true);

                w.bind('resize', function () {
                    scope.landscapemode = displayModeService.detectOrientation() ? 'landscapemode' : 'portraitmode';
                    scope.landscapemodehide = function(){
                        return displayModeService.detectOrientation();
                    };

                    var chartDiv = document.querySelectorAll('[kendo-chart]');
                    angular.forEach(chartDiv, function (value, key) {
                        var chartTemp = $(value)
                        var chart = chartTemp.data("kendoChart");

                        var chartD = chartTemp.data("kendoDonut");
                        //console.log(chartD)
                        if (chart) {
                            chart.resize();
                        } else {
                            //kendo.resize($(chartTemp[0]))
                        }

                    });

                    var chartDivRadial = document.querySelectorAll('[kendo-radialgauge]');

                    angular.forEach(chartDivRadial, function (value, key) {
                        var chartTemp = $(value);
                        // console.log(chartTemp)
                        var gauge = chartTemp.data("kendoRadialGauge");
                        //console.log(gauge)

                        if (gauge)
                            gauge.resize();

                    });
                    scope.$apply();
                });

                angular.element($window).bind("scroll", function() {
                    if(!displayModeService.detectOrientation()){
                        if (this.pageYOffset >= 41) {
                            scope.boolChangeClass = true;
                        } else {
                            scope.boolChangeClass = false;
                        }
                    }
                    scope.$apply();
                });
            }
        }
    })
    .directive('calendar', function (calendarService, $animate, timeServices) {
        return {
            restrict: "E",
            templateUrl: "content/templates/cal.html",
            scope: {
                selected: "="
            },
            link: function (scope) {

                scope.showCal = false;
                scope.$parent.showCal = scope.showCal;


                scope.selected = timeServices.zeroHour((moment(Date.parse(scope.$parent.date))));
                scope.month = scope.selected.clone();
                scope.controller = scope.$parent.name;
                scope.todayMonth = scope.selected.clone()

                var start = scope.selected.clone();
                var todayZoomStart = scope.selected.clone();

                start.date(1);
                todayZoomStart.date(1);
                timeServices.removeTime(start.day(0));
                timeServices.removeTime(todayZoomStart.day(0));

                _buildMonth(scope, start, scope.month);

                scope.zoomToday = function (selected) {
                    scope.today = moment();

                    scope.selected = moment();
                    scope.$parent.date = scope.selected.month() + 1 + '/' + scope.selected.date() + '/' + scope.selected.year();

                    _buildMonth(scope, todayZoomStart, scope.todayMonth);
                    var next = scope.month.clone();
                    timeServices.removeTime(next.month(next.month() + 1).date(1));
                    var previous = scope.month.clone();
                    timeServices.removeTime(previous.month(previous.month() - 1).date(1));
                    scope.month = scope.selected;
                    scope.selected = timeServices.zeroHour(moment());
                    scope.select(scope.selected)
                    //scope.$parent.data.selected.indexArray = [timeServices.getWeekOfMonth(scope.selected),scope.selected._d.getDay()]
                };

                scope.select = function (day) {
                    scope.selected = day;
                    scope.$parent.date = scope.selected.month() + 1 + '/' + scope.selected.date() + '/' + scope.selected.year();
                };

                scope.next = function () {
                    scope.showCal = true;
                    var next = scope.month.clone();
                    var nextSelect = scope.selected.clone();
                    _removeTime(next.month(next.month() + 1).date(1));
                    scope.month.month(scope.month.month() + 1);
                    timeServices.zeroHour(nextSelect.month(nextSelect.month() + 1));
                    //if(timeServices.zeroHour(nextSelect)._d.getDay()===6)
                    //timeServices.zeroHour(nextSelect).day(5);
                    //if(timeServices.zeroHour(nextSelect)._d.getDay()===0)
                    //timeServices.zeroHour(nextSelect).day(1);
                    scope.selected = timeServices.zeroHour(nextSelect)
                    scope.select(scope.selected)
                    _buildMonth(scope, next, scope.month);
                };

                scope.previous = function () {
                    scope.showCal = true;
                    var previous = scope.month.clone();
                    var previousSelect = scope.selected.clone();
                    _removeTime(previous.month(previous.month() - 1).date(1));
                    scope.month.month(scope.month.month() - 1);
                    timeServices.zeroHour(previousSelect.month(previousSelect.month() - 1));
                    //if(timeServices.zeroHour(previousSelect)._d.getDay()===6)
                    //timeServices.zeroHour(previousSelect).day(5);
                    //if(timeServices.zeroHour(previousSelect)._d.getDay()===0)
                    //timeServices.zeroHour(previousSelect).day(1);
                    scope.selected = timeServices.zeroHour(previousSelect)
                    scope.select(scope.selected)
                    _buildMonth(scope, previous, scope.month);
                };

                scope.selected = timeServices.zeroHour(moment());


                scope.select(moment(Date.parse(scope.$parent.date)))

                scope.$watchGroup(['showCal'], function (newValue, oldValue) {
                    scope.$parent.showCal = scope.showCal;

                }, true);


            }
        };

        function _removeTime(date) {
            return date.day(0).hour(0).minute(0).second(0).millisecond(0);
        }

        function _buildMonth(scope, start, month) {
            scope.weeks = [];
            scope.$parent.weeks = scope.weeks;
            var done = false, date = start.clone(), monthIndex = date.month(), count = 0;
            while (!done) {
                scope.weeks.push({days: _buildWeek(scope, date.clone(), month, scope.$parent.name)});
                date.add(1, "w");
                done = count++ > 2 && monthIndex !== date.month();
                monthIndex = date.month();
            }

        }

        function _buildWeek(scope, date, month, dataDisplay) {
            //console.log(month)
            //console.log(date)
            var days = [];
            for (var i = 0; i < 7; i++) {
                days.push({
                    name: date.format("dd").substring(0, 1),
                    number: date.date(),
                    isCurrentMonth: date.month() === month.month(),
                    isToday: date.isSame(new Date(), "day"),
                    date: date,
                    uiData: new kendo.data.DataSource({
                        data: []
                    })

                });
                if (month._d.getMonth() === date._d.getMonth())
                    calendarService.getDayData(scope, date.clone(), dataDisplay, month, i);
                date = date.clone();
                date.add(1, "d");
            }
            return days;
        }
    })
    .directive('calendarnav',function(){
        return {
            restrict: "A",
            link: function (scope, element, attrs) {

            }
        }
    })
    .service('chartService', function () {
        var chart = {};
        chart.checkNumberNaN = function(value){
            value = !isNaN(value) ? value: 0;
            return value;
        };
        chart.doughnut = function (textValue,holeSize) {
            var center;
            var radius;
            var doughnut = {
                title: {
                    visible: false
                },
                legend: {
                    visible: false
                },
                chartArea: {
                    background: ""
                },
                seriesDefaults: {
                    type: "donut",
                    startAngle: 90,
                    //size: 6,
                    holeSize: holeSize,
                    padding: 0,
                    field: "value",
                    categoryField: "category",
                    "overlay": {
                        "gradient": "none"
                    },
                    highlight: {
                        visible: false
                    },
                },
                series: [{
                    visual: function (e) {
                        // Obtain parameters for the segments
                        // Will run many times, but that's not an issue
                        center = e.center;
                        radius = e.radius;

                        // Create default visual
                        return e.createVisual();
                    },
                }],
                tooltip: {
                    visible: false,
                    format: "{0}%"
                },
                render: function (e) {
                    var draw = kendo.drawing;
                    var geom = kendo.geometry;
                    var chart = e.sender;

                    // The center and radius are populated by now.
                    // We can ask a circle geometry to calculate the bounding rectangle for us.
                    //
                    // http://docs.telerik.com/kendo-ui/api/javascript/geometry/circle#methods-bbox
                    var circleGeometry = new geom.Circle(center, radius);
                    var bbox = circleGeometry.bbox();

                    // Render the text
                    //
                    // http://docs.telerik.com/kendo-ui/api/javascript/dataviz/drawing/text
                    var text = new draw.Text((e.sender._model.chart.dataSource._data[0].actualValue?e.sender._model.chart.dataSource._data[0].actualValue:e.sender._model.chart.dataSource._data[0].value) + '%', [0, 0], {
                        //TODO:dynamic for calendar vs RR
                        //11px for calendar
                        //14px for page
                        font: "bold 11px sans-serif"
                    });

                    // Align the text in the bounding box
                    //
                    // http://docs.telerik.com/kendo-ui/api/javascript/drawing#methods-align
                    // http://docs.telerik.com/kendo-ui/api/javascript/drawing#methods-vAlign
                    draw.align([text], bbox, "center");
                    draw.vAlign([text], bbox, "center");

                    // Draw it on the Chart drawing surface
                    e.sender.surface.draw(text);

                }
            };
            return doughnut;
        }
        return chart;
    })
    .service('calendarService', function (APIService, chartService, $location) {
        var calendar = {};
        calendar.createDoughnutData = function(scope,date,data,page){
            var holeSize = 14;
            scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].data = {};
            scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].data.Booked_Capacity = data;
            var tempData = []
            var graphData = {};
            var graphDataAlt = {};
            graphData.category = "Booked Capacity";
            graphDataAlt.category = "UnBooked";
            graphData.color = calendar.makeColor(data,page);
            graphDataAlt.color = "rgba(0,0,0,.2)";
            graphData.actualValue = data;
            graphData.value = data>100?100:data;
            graphDataAlt.value = 100 - graphData.value;
            tempData.push(graphData);
            tempData.push(graphDataAlt);
            scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].bookedCap = data;
            scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].uiData.data(tempData);
            scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].chartData = {};
            scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].doughnut = chartService.doughnut(scope.weeks[calendar.weekOfMonth(date)].days[date._d.getUTCDay()].bookedCap,holeSize);

        };
        calendar.getDayData = function (scope, date) {
            //console.log(date._d.valueOf())
            var APIDate = date;
            //console.log(APIDate._d.valueOf())
            switch ($location.$$path) {
                case '/roomsrunning':
                    APIService.getCalendarRapidData(APIDate, APIDate).then(function (response, data) {

                        var responsDate = APIDate;
                        if (date._d.getDay() != 0 && date._d.getDay() != 6) {
                            calendar.createDoughnutData(scope,responsDate,parseInt(response.data[0].Booked_Capacity),'roomsrunning');
                            // calendar.createDoughnutData(scope,responsDate,parseInt(response.data[0].Booked_Capacity.split("%")[0]),'roomsrunning');
                        }
                    });
                    break;
                case '/ortracking':   APIService.getORTracking(APIDate.month()+1 + '/' + APIDate.date() + '/' + APIDate.year()).then(function (response) {
                        var responsDate = APIDate;
                        calendar.createDoughnutData(scope,responsDate,parseInt(chartService.checkNumberNaN(Math.round(response.data.FirstCaseOnTime.PatientInRoom.ActualStarts/response.data.FirstCaseOnTime.PatientInRoom.BookedStarts*100))),'ortracking');
                        });
                    break;
                default:
                    //return 0;
                    break;
            }
        };
        calendar.buildmonth = function (scope, start, month) {
            scope.weeks = [];
            scope.weekNumberSelected = 0;
            scope.weekNumberStart = calendar.weekOfMonth(month);
            var done = false, date = start.clone(), monthIndex = date.month(), count = 0;
            while (!done) {
                scope.weeks.push({
                    days: calendar.buildWeek(date.clone(), start, month)
                });
                date.add(1, 'w');
                done = count++ && monthIndex !== date.month();
                monthIndex = date.month();
            }
            var foo = [1, 2];
            return foo;
        };
        calendar.buildWeek = function (date, start, month) {
            var days = [];
            for (var i = 0; i < 7; i++) {
                days.push({
                    name: date.format("dd").substring(0, 1),
                    number: date.date(),
                    isCurrentMonth: date.month() === month.month(),
                    isToday: date.isSame(new Date(), "day"),
                    date: date
                });
                date = date.clone();
                date.add(1, "d");
            }
            return days;
        };
        calendar.weekOfMonth = function (date) {
            var month = date.month();
            var year = date.year();
            var lastDateOfMonth = date.daysInMonth();
            var firstDayOfMonth = moment([year, month, 1]);
            var dayOfWeek = date.day();

            var offSetDate = date.date() + firstDayOfMonth.day() - 1;
            var index = 1;
            var weeksInMonth = index + Math.ceil((lastDateOfMonth + firstDayOfMonth - 7) / 7);
            var week = Math.floor(offSetDate / 7);
            return week;
        };
        calendar.weeksOfMonth = function (date) {
            var prefixes = [1, 2, 3, 4, 5];
            return prefixes[0 | moment(date).date() / 7]
        };
        calendar.makeColor = function (percentage,graph) {
            //console.log(graph)
            var color = '';
            makeColorSwitch = function(ColorArray){
                angular.forEach(ColorArray, function (value, key) {
                    if (percentage >= value.low && color == ''){
                        color = value.color;
                    }
                });
            };
            switch (graph){
                case 'roomsrunning':
                    makeColorSwitch([
                        {name: 'red', color: '#DA291C', 'high': 100, 'low': 85},
                        {name: 'Yellow', color: '#F9CA1F', 'high': 84, 'low': 80},
                        {name: 'green', color: '#529144', 'high': 79, 'low': 0}
                    ]);
                    break;
                case 'ortracking':
                    makeColorSwitch([
                        {name: 'green', color: '#529144', 'high': 100, 'low': 70},
                        {name: 'Yellow', color: '#F9CA1F', 'high': 69, 'low': 40},
                        {name: 'red', color: '#DA291C', 'high': 39, 'low': 0}
                    ]);
                    break;
            }
            return color;
        };
        return calendar;
    })
    .service('preferences', function () {
        var preference = {};

        preference.updateLocalStorageItem = function (key, value) {
            localStorage.setItem(key, value)
        };
        preference.retrieveFromLocalStorage = {};


        /* GLOBAL FILTERS */
        preference.retrieveFromLocalStorage.global = {};
        preference.retrieveFromLocalStorage.global.facility = function () {
            if (localStorage.facility === undefined) {
                preference.updateLocalStorageItem("facility", "1010001")
            }
            ;
            return localStorage.facility;
        };

        preference.retrieveFromLocalStorage.global.service = function () {
            if (localStorage.service === undefined) {
                preference.updateLocalStorageItem("service", "0")
            }
            ;
            return localStorage.service;
        };

        /* Rooms Running Filters*/
        preference.retrieveFromLocalStorage.roomsrunning = {};
        preference.retrieveFromLocalStorage.roomsrunning.roboblocks = function () {
            //preference.updateLocalStorageItem("roboblocks","false")
            if (localStorage.roboblocks === undefined) {
                preference.updateLocalStorageItem("roboblocks", "false")
            }
            ;
            return localStorage.roboblocks;
        };
        preference.retrieveFromLocalStorage.roomsrunning.booked = function () {
            if (localStorage.booked === undefined) {
                preference.updateLocalStorageItem("booked", 'true')
            }
            ;
            return localStorage.booked;
        };
        preference.retrieveFromLocalStorage.roomsrunning.actual = function () {
            if (localStorage.actual === undefined) {
                preference.updateLocalStorageItem("actual", 'false')
            }
            ;
            return localStorage.actual;
        };
        preference.retrieveFromLocalStorage.roomsrunning.standby = function () {
            //preference.updateLocalStorageItem("standby","true")
            if (localStorage.standby === undefined) {
                preference.updateLocalStorageItem("standby", "false")
            }
            ;
            return localStorage.standby;
        };

        /* ORTracking Filters */
        preference.retrieveFromLocalStorage.ortracking = {};
        preference.retrieveFromLocalStorage.ortracking.room = function () {
            if (localStorage.room === undefined) {
                preference.updateLocalStorageItem("room", "")
            }
            ;
            return localStorage.room;
        };
        preference.retrieveFromLocalStorage.ortracking.booked = function () {
            if (localStorage.booked === undefined) {
                preference.updateLocalStorageItem("booked", 'false')
            }
            ;
            return localStorage.booked;
        };
        preference.retrieveFromLocalStorage.ortracking.actual = function () {
            if (localStorage.actual === undefined) {
                preference.updateLocalStorageItem("actual", 'true')
            }
            ;
            return localStorage.actual;
        };
        preference.retrieveFromLocalStorage.ortracking.resolution = function () {
            if (localStorage.resolution === undefined) {
                preference.updateLocalStorageItem("resolution", "60")
            }
            ;
            return localStorage.resolution;
        };
        preference.retrieveFromLocalStorage.ortracking.onTimeThreshold = function () {
            if (localStorage.onTimeThreshold === undefined) {
                preference.updateLocalStorageItem("onTimeThreshold", "0")
            }
            ;
            return localStorage.onTimeThreshold;
        };
        preference.retrieveFromLocalStorage.ortracking.orTrackingDate = function () {
            if (localStorage.orTrackingDate === undefined) {
                preference.updateLocalStorageItem("orTrackingDate", moment())
            }
            ;
            return localStorage.orTrackingDate;
        };


        return preference;
    })
    .service('gaugeService', function () {

        var gauge = {};
        // builds a single Gauge or [] of Gauges depending on value
        // type is either half or full


        gauge.buildGauge = function(value,type, color, gaugemax) {
            gaugemax = gaugemax || 100;
            //console.log(value, type, color, gaugemax);
            value = value > 100 ? 100 : value;
            color = color || "#6f487d";
            //console.log("IN BUILDGAUGE", color, value, type);

            function checkGaugeType(type, gaugevalue) {
                var newGauge = {};
                if (gaugevalue < 0) { gaugevalue=0;}
                if (type == 'half') {
                     newGauge = {
                        rangeSize: 8,
                        majorTicks: {visible: false},
                        minorTicks: {visible: false},
                        labels: {
                            visible: false
                        },
                        min: 0,
                        max: gaugemax,
                        startAngle: 0,
                        endAngle: 180,
                        ranges: [
                            {
                                from: 0,
                                to: gaugevalue,
                                color: color
                            }
                        ]
                    };
                }
                else if (type == 'full') {
                     newGauge = {
                        rangeSize: 6,
                        majorTicks: {visible: false},
                        minorTicks: {visible: false},
                        labels: {visible: false},
                        min: 0,
                        max: gaugemax,
                        startAngle: 90,
                        endAngle: 450,
                        ranges: [
                            {
                                from: 0,
                                to: gaugevalue,
                                color: color
                            }
                        ]
                    };

                }
                return newGauge;
            }


            value = angular.isNumber(value) ? value: 0;

            if (typeof value == 'number'){
                if (value < 0) {value = 0;}
                var Gauge = checkGaugeType(type,value);

            }else if (angular.isNumber(value.length)) {
                var Gauge = [];
                for (var i=0; i<value.length; i++){
                    Gauge.push(checkGaugeType(type, value[i]));
                }
            } else{
                var Gauge = [];
            }

            return Gauge;

        };
        // Format an [] of Gauges
        //gauge.addGaugeMarkers = addGaugeMarkers;

        // Needs to account for variable thresholds, adds markers to [] of Gauges
        // Threshold should be formatted as :
        // var thresholds=[{value: 40, color:'#DA291C'},{value: 70, color:'#F9CA1F'},{value: 101, color:'#529144'}];

        gauge.addGaugeMarkers = function(gauges, thresholds) {

            thresholds = thresholds || 0;
            //console.log(thresholds);

            function pushMarkers(markers, thresholds) {
                var max = gauges[i].ranges[0].to;
                var color ='#FFFFFF';
                //console.log(max, thresholds,markers);
                // control the thresholds here
                if(max < thresholds[0].value){
                    color = thresholds[0].color; // Red
                }else if(max < thresholds[1].value){
                    color = thresholds[1].color; // Yellow

                }else if (max < thresholds[2].value) {
                    color = thresholds[2].color; // Green
                }
                gauges[i].ranges[0].color = color;

                for (var j = 0; j < markers.length; j++) {
                    if (max < markers[j].to) {
                        gauges[i].ranges.push(markers[j]);
                    } else if (max >= markers[j].to) {
                        //gauges[i].ranges[j].to = markers[j].to;
                        gauges[i].ranges.push(markers[j]);
                        gauges[i].ranges.push({from: markers[j].to, to: max, color: color});
                    }
                }

            }

            for (var i = 0; i < gauges.length; i++) {
                if (gauges[i].endAngle == 180) {
                    var markers = [
                        {
                            from: thresholds[0].value-1,
                            to: thresholds[0].value+1,
                            color: "#f2f3f4"
                        },
                        {
                            from: thresholds[1].value-1,
                            to: thresholds[1].value+1,
                            color: "#f2f3f4"
                        }
                    ];

                    pushMarkers(markers, thresholds);

                } else if (gauges[i].endAngle == 450) {
                    var markers = [
                        {
                            from: thresholds[0].value-1,
                            to: thresholds[0].value+1,
                            color: "#f2f3f4"
                        },
                        {
                            from: thresholds[1].value-1,
                            to: thresholds[1].value+1,
                            color: "#f2f3f4"
                        }
                    ];
                    pushMarkers(markers,thresholds);
                }

            }
            return gauges;
        }

        return gauge;

    })
    .service('checkLocalStorageService',function(APIService,preferences){
        var localStorageServices = {};

        localStorageServices.checkBoolean = function(storage,defaultValue,callBack){
            var match = 0;
            switch(callBack){
                case 'false':
                    match = 1;
                    break;
                case 'true':
                    match = 1;
                    break;
                default:
                    preferences.updateLocalStorageItem(storage,defaultValue);
                    location.reload();
                    break;
            }
            return match;
        };

        localStorageServices.checkLoop = function(options,storage,defaultValue,callBack){
            var match = 0;
            angular.forEach(options,function(value,key){
                if(value.value===callBack.toString()){
                    match = 1
                }
            });
            if (match === 0){
                preferences.updateLocalStorageItem(storage,defaultValue);
                console.log('there was a bad value')
                location.reload();
                return match
            };
            return match;
        };

        localStorageServices.global = {};
        localStorageServices.global.facility = function () {
            APIService.getLocations().then(function (response) {
              var facilitiesOptions = response.data;
                angular.forEach(facilitiesOptions,function(value,key){
                    value.value = value.InternalId;
                });
                localStorageServices.checkLoop(facilitiesOptions,"facility", "1010001",preferences.retrieveFromLocalStorage.global.facility())
            });
        };

        localStorageServices.global.service = function () {
            return APIService.getServices().then(function (response) {
                var serviceOptions = response.data;
                var allObject = {
                    title:"ALL",
                    value:"0"
                };
                serviceOptions.push(allObject)
                return localStorageServices.checkLoop(serviceOptions,"service", "0",preferences.retrieveFromLocalStorage.global.service())
            }).$$state.status;
        };

        /* Rooms Running Filters*/
        localStorageServices.roomsrunning = {};
        localStorageServices.roomsrunning.roboblocks = function () {
            return localStorageServices.checkBoolean("roboblocks",false,preferences.retrieveFromLocalStorage.roomsrunning.roboblocks());
        };
        localStorageServices.roomsrunning.booked = function () {
            return localStorageServices.checkBoolean("booked",true,preferences.retrieveFromLocalStorage.roomsrunning.booked());
        };
        localStorageServices.roomsrunning.actual = function () {
            return localStorageServices.checkBoolean("actual",true,preferences.retrieveFromLocalStorage.roomsrunning.actual());
        };
        localStorageServices.roomsrunning.standby = function () {
            return localStorageServices.checkBoolean("standby",false,preferences.retrieveFromLocalStorage.roomsrunning.standby());
        };

        localStorageServices.roomsrunning.checkAll = function () {
            localStorageServices.global.service();
            localStorageServices.global.facility();
            localStorageServices.roomsrunning.roboblocks()+localStorageServices.roomsrunning.booked()+localStorageServices.roomsrunning.actual()+localStorageServices.roomsrunning.standby()===4?'yes':location.reload();
        };

        /* ORTracking Filters */
        localStorageServices.ortracking = {};
        localStorageServices.ortracking.room = function () {
            APIService.getRooms().then(function (response) {
                var roomOptions = response.data;
                angular.forEach(roomOptions,function(value,key){
                    value.value = value.id;
                });
                var allObject = {
                    description:"ALL",
                    value:"",
                    id:""
                };
                roomOptions.push(allObject);
                return localStorageServices.checkLoop(roomOptions,"room", "",preferences.retrieveFromLocalStorage.ortracking.room())
            })
        };
        localStorageServices.ortracking.booked = function () {
            return localStorageServices.checkBoolean("booked",true,preferences.retrieveFromLocalStorage.ortracking.booked());
        };
        localStorageServices.ortracking.actual = function () {
            return localStorageServices.checkBoolean("actual",false,preferences.retrieveFromLocalStorage.ortracking.actual());
        };
        localStorageServices.ortracking.resolution = function () {
            APIService.getSelects().then(function (response) {
                var resolutionOptions = response.data.selectgroups.resolutionOptions;
                angular.forEach(resolutionOptions,function(value,key){
                    value.value = value.optionValue;
                });
                return localStorageServices.checkLoop(resolutionOptions,"resolution", "60",preferences.retrieveFromLocalStorage.ortracking.resolution())
            })
        };
        localStorageServices.ortracking.onTimeThreshold = function () {
            APIService.getSelects().then(function (response) {
                var onTimeThresholdOptions = response.data.selectgroups.onTimeThresholdOptions;
                angular.forEach(onTimeThresholdOptions,function(value,key){
                    value.value = value.optionValue;
                });
                return localStorageServices.checkLoop(onTimeThresholdOptions,"onTimeThreshold", "0",preferences.retrieveFromLocalStorage.ortracking.onTimeThreshold())
            })
        };

        localStorageServices.ortracking.checkAll = function () {
            localStorageServices.global.service();
            localStorageServices.global.facility();
            localStorageServices.ortracking.resolution();
            localStorageServices.ortracking.room();
            localStorageServices.ortracking.onTimeThreshold();

            localStorageServices.ortracking.booked()+localStorageServices.ortracking.actual()===2?'yes':location.reload();
        };

        return localStorageServices;
    })
    .factory('timeServices', function () {
        var time = {};
        time.scopeTime = function () {

        };
        time.removeTime = function (date) {
            return date.day(0).hour(0).minute(0).second(0).millisecond(0);
        };
        time.zeroHour = function (date) {
            return date.hour(0).minute(0).second(0).millisecond(0);
        };
        time.isCurrentMonth = function (date) {
            if (angular.equals(moment()._d.getMonth(), date._d.getMonth())) {
                return true;
            } else {
                return false;
            }
        };
        time.isCalendarMonth = function (weeks, date) {
            angular.forEach(weeks, function (value, key) {
            })
        };
        time.getWeekOfMonth = function (date) {
            var month = date.month();
            var year = date.year();
            var lastDateOfMonth = date.daysInMonth();
            var firstDayOfMonth = moment([year, month, 1]);
            var dayOfWeek = date.day();

            var offSetDate = date.date() + firstDayOfMonth.day() - 1;
            var index = 1;
            var weeksInMonth = index + Math.ceil((lastDateOfMonth + firstDayOfMonth - 7) / 7);
            var week = Math.floor(offSetDate / 7);
            return week;
        };
        return time;
    })
    .factory('APIService', function ($http, preferences) {
        var APIData = {};
        var URLCommon = {};
        URLCommon.base = "https://utmormwebnt.mdacc.tmc.edu/";
        URLCommon.commonURLDirProd = "ORCapacityProd/"
        URLCommon.commonURLDirDemo = "ORCapacityDemo/";
        URLCommon.URLPathDir = "ORCapacityTestNew/";
        URLCommon.URLPathDir2 = "api/m/";
        var aP = '&';
        var sL = '/';

        var selectPaths = {};
        selectPaths.locations = 'settings/locations';
        selectPaths.rooms = 'settings/rooms';
        selectPaths.services = 'settings/surgical-services';

        APIData.getCalendarRapidData = function (startDate, endDate) {
            //console.log(startDate)
                var calVConfig = {}
                //var DailyIURLBase = "https://utmormwebnt.mdacc.tmc.edu/ORCapacityTest/calendarapidata.ashx?";
                var DailyIURLBase = "https://utmormwebnt.mdacc.tmc.edu/ORCapacity/calendarapidata.ashx?";
                var URLExt= "calendarview/";
                var URLEXTBet = "between/"
                var facilityEPIC = localStorage.facility ? "facility=" + localStorage.facility : "facility=" + preferences.retrieveFromLocalStorage.global.facility();
                var facility = "&facility=" + preferences.retrieveFromLocalStorage.global.facility();
                var SVCEPIC = localStorage.service ? "svc=" + localStorage.service : "svc=" + preferences.retrieveFromLocalStorage.global.service();
                var SVC = "&svc=" + preferences.retrieveFromLocalStorage.global.service();
                var stdbyEPIC = "stdby=" + (JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.standby()==='y') ? "true" : "false");
                var stdby = "&stdby=" + preferences.retrieveFromLocalStorage.roomsrunning.standby();
                var roboEPIC = "robo=" + JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.roboblocks());
                var robo = "&robo=" + (JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.roboblocks()) ? "1" : "0");
                var startEPIC = moment(startDate)._d.getMonth()+1 + '-' + moment(startDate)._d.getDay() + '-' + moment(startDate)._d.getFullYear();
                var start = "&start=" + startDate / 1000;
                var endEPIC = moment(endDate)._d.getMonth()+1 + '-' + moment(endDate)._d.getDay() + '-' + moment(endDate)._d.getFullYear()
                var end = "&end=" + endDate / 1000;
                //var newURLEPICCal = URLBase + tempURLPATHEPICDIREPIC + tempURLPATHEPICDIR2EPIC + URLExtEPIC + URLEXTBet + startEPIC +sL+ endEPIC +'?'+ facilityEPIC + aP + SVCEPIC + aP + stdbyEPIC + aP + roboEPIC;
                //console.log(newURLEPICCal)
                calVConfig.URLEXTBet = "between/"




            //console.log((moment(startDate)._d.getDay()+1).length>1?(moment(startDate)._d.getDay()+1):'0'+(moment(startDate)._d.getDay()+1))
                calVConfig.startDateM = (moment(startDate)._d.getMonth()+1).length>1?(moment(startDate)._d.getMonth()+1):'0'+(moment(startDate)._d.getMonth()+1);
            calVConfig.startDateD = (moment(startDate)._d.getDate());
            //calVConfig.startDateD = (moment(startDate)._d.getDay()+1).length>1?(moment(startDate)._d.getDay()+1):'0'+(moment(startDate)._d.getDay()+1);
                calVConfig.startEPIC = calVConfig.startDateM + '-' + calVConfig.startDateD + '-' + moment(startDate)._d.getFullYear();

                calVConfig.endDateM = (moment(endDate)._d.getMonth()+1).length>1?(moment(endDate)._d.getMonth()+1):'0'+(moment(endDate)._d.getMonth()+1);
            calVConfig.endDateD = (moment(endDate)._d.getDate());
                //calVConfig.endDateD = (moment(endDate)._d.getDay()+1).length>1?(moment(endDate)._d.getDay()+1):'0'+(moment(endDate)._d.getDay()+1);
                calVConfig.endEPIC = calVConfig.endDateM + '-' + calVConfig.endDateD + '-' + moment(endDate)._d.getFullYear();

                calVConfig.urlExt = "calendarview/";
                calVConfig.facilityEPIC = localStorage.facility ? localStorage.facility : preferences.retrieveFromLocalStorage.global.facility();
                calVConfig.SVCEPIC = localStorage.service ? localStorage.service : preferences.retrieveFromLocalStorage.global.service();
                calVConfig.stdbyEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.standby()==='y' ? "true" : "false");
                calVConfig.roboEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.roboblocks());
                calVConfig.bookedEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.booked());
                calVConfig.actualEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.actual());
//console.log(URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + calVConfig.urlExt + calVConfig.URLEXTBet + calVConfig.startEPIC +'/'+ calVConfig.endEPIC)
                return $http({
                    //url: DailyIURLBase + facility + SVC + stdby + robo + start + end,
                    url:URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + calVConfig.urlExt + calVConfig.URLEXTBet + calVConfig.startEPIC +'/'+ calVConfig.endEPIC,
                    method:"GET",
                    //withCredentials:true,
                    params:{
                        facility:calVConfig.facilityEPIC,
                        svc:calVConfig.SVCEPIC,
                        stdby:calVConfig.stdbyEPIC,
                        robo:calVConfig.roboEPIC
                    }
                });
            };
        APIData.getRoomsRunning = function (date) {
            var rrxConfig = {};
            rrxConfig.dateYear = date.split("/")[2]
            rrxConfig.dateMonth = date.split("/")[0].length>1?date.split("/")[0]:'0'+date.split("/")[0];
            rrxConfig.dateDay = date.split("/")[1].length>1?date.split("/")[1]:'0'+date.split("/")[1];
            rrxConfig.date = rrxConfig.dateYear + '-' +  rrxConfig.dateMonth + '-' + rrxConfig.dateDay;
            rrxConfig.urlExt = "roomsrunning/";
            rrxConfig.facilityEPIC = localStorage.facility ? localStorage.facility : preferences.retrieveFromLocalStorage.global.facility();
            rrxConfig.SVCEPIC = localStorage.service ? localStorage.service : preferences.retrieveFromLocalStorage.global.service();
            rrxConfig.stdbyEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.standby()==='y' ? "true" : "false");
            rrxConfig.roboEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.roboblocks());
            rrxConfig.bookedEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.booked());
            rrxConfig.actualEPIC = JSON.parse(preferences.retrieveFromLocalStorage.roomsrunning.actual());
            return $http({
                url:URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + rrxConfig.urlExt + rrxConfig.date,
                    method:"GET",
                //withCredentials:true,
                params:{
                    facility:rrxConfig.facilityEPIC,
                    svc:rrxConfig.SVCEPIC,
                    stdby:rrxConfig.stdbyEPIC,
                    robo:rrxConfig.roboEPIC,
                    booked:rrxConfig.bookedEPIC,
                    actual:rrxConfig.actualEPIC
                }
          });
        };
        APIData.getORTracking = function (date) {
            var orTConfig = {};
            orTConfig.dateYear = date.split("/")[2]
            orTConfig.dateMonth = date.split("/")[0].length>1?date.split("/")[0]:'0'+date.split("/")[0];
            orTConfig.dateDay = date.split("/")[1].length>1?date.split("/")[1]:'0'+date.split("/")[1];
            orTConfig.date = orTConfig.dateYear + '-' +  orTConfig.dateMonth + '-' + orTConfig.dateDay;

            orTConfig.urlExt = "ortracking/";
            orTConfig.facilityEPIC = localStorage.facility ? localStorage.facility : preferences.retrieveFromLocalStorage.global.facility();
            orTConfig.SVCEPIC = localStorage.service ? localStorage.service : preferences.retrieveFromLocalStorage.global.service();
            orTConfig.bookedEPIC = JSON.parse(preferences.retrieveFromLocalStorage.ortracking.booked());
            orTConfig.actualEPIC = JSON.parse(preferences.retrieveFromLocalStorage.ortracking.actual());
            orTConfig.ontimeEPIC = JSON.parse(preferences.retrieveFromLocalStorage.ortracking.onTimeThreshold());
            orTConfig.resEPIC = JSON.parse(preferences.retrieveFromLocalStorage.ortracking.resolution());
            orTConfig.roomEPIC = localStorage.room ? localStorage.room : preferences.retrieveFromLocalStorage.ortracking.room();
            return $http({
                url:URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + orTConfig.urlExt + orTConfig.date,
                method:"GET",
                //withCredentials:true,
                params:{
                    facility:orTConfig.facilityEPIC,
                    svc:orTConfig.SVCEPIC,
                    ontime:orTConfig.ontimeEPIC,
                    res:orTConfig.resEPIC,
                    room:orTConfig.roomEPIC,
                    booked:orTConfig.bookedEPIC,
                    actual:orTConfig.actualEPIC
                }
            });
        };

        APIData.getLocations = function(){
            return $http({
                url:URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + selectPaths.locations
            })
        };

        APIData.getRooms = function(){
            return $http({
                url:URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + selectPaths.rooms
            })
        };


        APIData.getServices = function(){
            return $http({
                url:URLCommon.base + URLCommon.commonURLDirProd + URLCommon.URLPathDir2 + selectPaths.services
            })
        };

        APIData.getSelects = function(){
            return $http({
                url:'content/data/selects.json'
            })
        };

        return APIData;
    })
    .factory('displayModeService', function ($window) {
        var displayMode = {};
        displayMode.calendarOpen = function(){
            return { items: [] };
        }
        displayMode.detectElementSize = function (elem) {
            var parentSize = 0;
            if (document.getElementsByTagName(elem)[0])
                parentSize = document.getElementsByTagName(elem)[0].getBoundingClientRect();
            return parentSize;
        };
        displayMode.detectWide = function () {
            if ($window.innerWidth > window.innerHeight) {
                if (!navigator.userAgent.match(/Intel Mac OS X/i)
                    || !navigator.userAgent.match(/Windows/i)
                    || !navigator.userAgent.match(/iPad/i)
                    || $window.innerWidth > window.innerHeight
                ) {
                    return true
                }
                else {
                    return false;
                }
            } else {
                return false;
            }

        };
        displayMode.detectlandscapeMode = function () {
            if ($window.innerWidth > window.innerHeight) {
                if (!navigator.userAgent.match(/Intel Mac OS X/i)
                    || !navigator.userAgent.match(/Windows/i)
                    || !navigator.userAgent.match(/iPad/i)
                    || $window.innerWidth > window.innerHeight
                ) {
                    return true
                }
                else {
                    return false;
                }
            } else {
                return false;
            }

        };
        displayMode.detectOrientation = function () {
            if (!navigator.userAgent.match(/Intel Mac OS X/i)
                && !navigator.userAgent.match(/Windows/i)
                && !navigator.userAgent.match(/iPad/i)
                //&& $window.innerWidth < 768
                && $window.innerWidth > window.innerHeight
            ) {
                return true
            }
            else {
                return false;
            }
        };
        displayMode.returnAgentName = function () {
            var agentName;
            if (navigator.userAgent.match(/Android/i))
                agentName = "Android";
            if (navigator.userAgent.match(/webOS/i))
                agentName = "webOS";
            if (navigator.userAgent.match(/iPhone/i))
                agentName = "iPhone";
            if (navigator.userAgent.match(/iPad/i))
                agentName = "iPad";
            if (navigator.userAgent.match(/iPod/i))
                agentName = "iPod";
            if (navigator.userAgent.match(/BlackBerry/i))
                agentName = "BlackBerry";
            if (navigator.userAgent.match(/Windows Phone/i))
                agentName = "Windows Phone";
            if (navigator.userAgent.match(/Nokia/i))
                agentName = "Nokia";
            if (navigator.userAgent.match(/Intel Mac OS X/i))
                agentName = "Mac";
            if (navigator.userAgent.match(/Windows/i))
                agentName = "Windows";
            return agentName;
        };
        displayMode.detectSize = function () {
            var viewportSize = {};
            viewportSize.height = $window.innerHeight;
            viewportSize.width = $window.innerWidth;
            return viewportSize;
        };
        displayMode.detectAgent = function () {
            var userAgent = "";

            function detectmob() {
                if (navigator.userAgent.match(/Android/i)
                    || navigator.userAgent.match(/webOS/i)
                    || navigator.userAgent.match(/iPhone/i)
                    || navigator.userAgent.match(/iPad/i)
                    || navigator.userAgent.match(/iPod/i)
                    || navigator.userAgent.match(/BlackBerry/i)
                    || navigator.userAgent.match(/Windows Phone/i)
                ) {
                    return true;
                }
                else {
                    return false;
                }
            }

            if (detectmob() && navigator.userAgent.match(/iPad/)) {
                userAgent = navigator.userAgent.match(/iPad/)[0];
            } else if (detectmob() && navigator.userAgent.match(/iPhone/)) {
                userAgent = navigator.userAgent.match(/iPhone/)[0];
            } else if (detectmob() && navigator.userAgent.match(/Android/)) {
                userAgent = navigator.userAgent.match(/Android/)[0];
            }
            return userAgent;
        };
        return displayMode;
    })
    .config(function ($routeProvider) {
        $routeProvider
            .when('/roomsrunning', {
                templateUrl: '/content/templates/roomsrunning.html',
                controller: 'roomsRunningController',
                title: 'Rooms Running'
            })
            .when('/roomsrunningfilters', {
                templateUrl: '/content/templates/roomsrunningfilters.html',
                controller: 'roomsRunningFilters',
                title: 'Rooms Running Filters'
            })
            .when('/ortracking', {
                templateUrl: '/content/templates/ortracking.html',
                controller: 'orTrackingController',
                title: 'OR Tracking'
            })
            .when('/ortrackingfilters', {
                templateUrl: '/content/templates/ortrackingfilters.html',
                controller: 'orTrackingFilters',
                title: 'OR Tracking Filters'
            })
            .otherwise({
                redirectTo: '/roomsrunning'
            });

    });