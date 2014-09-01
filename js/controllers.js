'use strict';

angular.module('elevatorSim.controllers', []).

controller('IndexController', 
	['$scope', 'Logger', 'Simulation', 'Incrementer', 
	function($scope, Logger, Simulation, Incrementer) {
		
	$scope.logs = Logger.logs;
	$scope.simulation = new Simulation({ numElevators: 3, numFloors: 6 });
	
	$scope.resetSimulation = function() {
		if ($scope.resetSimElevators && $scope.resetSimFloors) {	
			$scope.simulation.init({ 
				numElevators: $scope.resetSimElevators,
				numFloors: $scope.resetSimFloors
			});
		}
	};
	
	$scope.stopSimulation = function() {
		$scope.simulation.stop();
	};
	
	$scope.addPassenger = function() {
		if ($scope.addPassengerStartLevel && $scope.addPassengerDestinationLevel) {
			$scope.simulation.addPassenger($scope.addPassengerStartLevel, $scope.addPassengerDestinationLevel);
		}
	};
	
	$scope.testSomething = function() {
		$scope.simulation.testSomething();
	};
	
	$scope.openElevator = function() {
		$scope.simulation.openElevator($scope.updateElevatorNumber);
	};
	
	$scope.closeElevator = function() {
		$scope.simulation.closeElevator($scope.updateElevatorNumber);
	};
	
	$scope.moveElevator = function() {
		$scope.simulation.moveElevator($scope.updateElevatorNumber, $scope.updateElevatorLevel);
	};
	
	$scope.setElevatorUp = function(up) {
		$scope.simulation.setElevatorDirection($scope.updateElevatorNumber, up);
	};
	
	$scope.addPickupStopToElevator = function(goingUp) {
		$scope.simulation.addPickupStopToElevator($scope.updateElevatorNumber, $scope.updateElevatorLevel, goingUp);
	};
	
	$scope.addDropoffStopToElevator = function() {
		$scope.simulation.addDropoffStopToElevator($scope.updateElevatorNumber, $scope.updateElevatorLevel);
	};
	
	
	/*
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
	*/
}]);