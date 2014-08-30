'use strict';

angular.module('elevatorSim.controllers', []).

controller('IndexController', ['$scope', 'Logger', 'Incrementer', function($scope, Logger, Incrementer) {
	$scope.testScope = "testing scope";
	
	$scope.incrementer1 = new Incrementer(1000);
	$scope.incrementer2 = new Incrementer(1500);
	
	$scope.filteredLogType = "1000";
	$scope.logs = Logger.logs;
	Logger.addLog("type1", "message1");
	Logger.addLog("type1", "message2");
	Logger.addLog("type2", "message3");
	
	$scope.changeFilter = function() {
		$scope.filteredLogType = ($scope.filteredLogType == "1000" ? null : "1000");
	};
	
	$scope.clearLogs = function() {
		Logger.clearLogs();
	};
}]);