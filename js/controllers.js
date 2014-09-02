'use strict';

angular.module('elevatorSim.controllers', []).

controller('IndexController', ['$scope', '$timeout', 'Logger', 'Simulation', function($scope, $timeout, Logger, Simulation) {
		
	var speedMultiplier = 5;
	$scope.logs = Logger.logs;
	$scope.simulation = new Simulation({ numElevators: 3, numFloors: 6, maxOccupancy: 10, speedMultiplier: speedMultiplier });
	$scope.addMultiplePassengersType = "RealisticRandom";
	$scope.automaticallyAddPassengersType = "RealisticRandom";
	$scope.automaticallyAddPassengersEnabled = true;
	
	$scope.resetSimulation = function() {
		if ($scope.resetSimElevators >= 1 && $scope.resetSimFloors >= 2 && $scope.resetSimMaxOccupancy >= 1 && $scope.resetSimSpeedMultiplier) {
			speedMultiplier = $scope.resetSimSpeedMultiplier;
			
			$scope.simulation.init({ 
				numElevators: $scope.resetSimElevators,
				numFloors: $scope.resetSimFloors,
				maxOccupancy: $scope.resetSimMaxOccupancy,
				speedMultiplier: $scope.resetSimSpeedMultiplier
			});
		
			$scope.resetSimElevators = "";
			$scope.resetSimFloors = "";
			$scope.resetSimMaxOccupancy = "";
			$scope.resetSimSpeedMultiplier = "";
		}
	};
	
	$scope.stopSimulation = function() {
		$scope.simulation.stop();
	};
	
	$scope.addPassenger = function() {
		if ($scope.addPassengerStartLevel > 0 && $scope.addPassengerStartLevel <= $scope.simulation.floors.length
			&& $scope.addPassengerDestinationLevel > 0 && $scope.addPassengerDestinationLevel <= $scope.simulation.floors.length) {
				
			$scope.simulation.addPassenger($scope.addPassengerStartLevel, $scope.addPassengerDestinationLevel);
		}
	};
	
	$scope.addMultiplePassengers = function() {
		if ($scope.addMultiplePassengersNumber > 0) {
			switch ($scope.addMultiplePassengersType) {
				case "RealisticRandom": 
					$scope.simulation.addPassengersRealisticRandom($scope.addMultiplePassengersNumber);
					return;
				case "ToGround": 
					$scope.simulation.addPassengersToGround($scope.addMultiplePassengersNumber);
					return;
				case "FromGround": 
					$scope.simulation.addPassengersFromGround($scope.addMultiplePassengersNumber);
					return;
				case "CompleteRandom": 
					$scope.simulation.addPassengersCompleteRandom($scope.addMultiplePassengersNumber);
					return;
			}
		}
	};
	
	var automaticallyAddNextPassenger = function() {
		if ($scope.automaticallyAddPassengersEnabled) {
			switch ($scope.automaticallyAddPassengersType) {
				case "RealisticRandom": 
					$scope.simulation.addPassengersRealisticRandom(1);
					break;
				case "ToGround": 
					$scope.simulation.addPassengersToGround(1);
					break;
				case "FromGround": 
					$scope.simulation.addPassengersFromGround(1);
					break;
				case "CompleteRandom": 
					$scope.simulation.addPassengersCompleteRandom(1);
					break;
			}
		}
	
		$timeout(function() {
			automaticallyAddNextPassenger();
		}, Math.ceil(10000 / (speedMultiplier || 1)));
	}
	automaticallyAddNextPassenger();
	
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