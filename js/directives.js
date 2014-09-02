'use strict';

angular.module('elevatorSim.directives', []).

directive('elevatorStops', function() {
	return {
		templateUrl: 'templates/elevator-stops.html'
	};
}).

directive('elevatorState', function() {
	return {
		templateUrl: 'templates/elevator-state.html'
	};
});