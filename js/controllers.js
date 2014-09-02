'use strict';

angular.module('elevatorSim.controllers', []).

controller('IndexController', ['$scope', 'Logger', 'Simulation', function($scope, Logger, Simulation) {
		
	$scope.logs = Logger.logs;
	$scope.simulation = new Simulation({ numElevators: 3, numFloors: 6, maxOccupancy: 10, speedMultiplier: 5 });
	$scope.resetSimSelectedSpeed = "Speed";
	
	$scope.resetSimulation = function() {
		if ($scope.resetSimElevators >= 1 && $scope.resetSimFloors >= 2 && $scope.resetSimMaxOccupancy >= 1 && $scope.resetSimMultiplier) {	
			$scope.simulation.init({ 
				numElevators: $scope.resetSimElevators,
				numFloors: $scope.resetSimFloors,
				maxOccupancy: $scope.resetSimMaxOccupancy,
				speedMultiplier: $scope.resetSimMultiplier
			});
		}
		
		$scope.resetSimElevators = "";
		$scope.resetSimFloors = "";
		$scope.resetSimMaxOccupancy = "";
		$scope.resetSimMultiplier = null;
		$scope.resetSimSelectedSpeed = "Speed";
	};
	
	$scope.stopSimulation = function() {
		$scope.simulation.stop();
	};
	
	$scope.setResetSimMultiplier = function(multiplier) {
		$scope.resetSimMultiplier = multiplier;
		$scope.resetSimSelectedSpeed = multiplier + "x";
	};
	
	$scope.addPassenger = function() {
		if ($scope.addPassengerStartLevel > 0 && $scope.addPassengerStartLevel <= $scope.simulation.floors.length
			&& $scope.addPassengerDestinationLevel > 0 && $scope.addPassengerDestinationLevel <= $scope.simulation.floors.length) {
				
			$scope.simulation.addPassenger($scope.addPassengerStartLevel, $scope.addPassengerDestinationLevel);
		}
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
}]);