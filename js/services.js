'use strict';

angular.module('elevatorSim.services', []).

service('Logger', function() {
	this.logs = [];
	
	this.log = function(type, message) {
		this.logs.push({ 
			timestamp: new Date().getTime(), 
			type: type,
			message: message 
		});
	};
	
	this.clearLogs = function() {
		this.logs.length = 0;
	};
}).

factory('Simulation', ['Logger', 'Elevator', 'Floor', 'Passenger', 
	function(Logger, Elevator, Floor, Passenger) {
	
	var Simulation = function(settings) {
		this.init(settings);
    };
    
    Simulation.prototype.init = function(settings) {
    	if (!settings || !settings.numElevators || !settings.numFloors) {
    		return;
    	}
		
		makeElevators.call(this, settings.numElevators);
		makeFloors.call(this, settings.numFloors);
		resetPassengers.call(this);
		
		initFloorElevatorSlots.call(this);
		initElevatorPickupDropoffStops.call(this);
		
		var groundFloor = this.getFloorForLevel(1);
		if (groundFloor) {
			initElevatorCurrentFloor.call(this, groundFloor);
		}
		
		Logger.log("Simulation", "Initialized simulation with " + settings.numElevators 
			+ " elevators and " + settings.numFloors + " floors.");
    };
    
    Simulation.prototype.addPassenger = function(startLevel, destinationLevel) {
    	var startFloor = this.getFloorForLevel(startLevel);
    	var destinationFloor = this.getFloorForLevel(destinationLevel);
    	
    	if (startFloor && destinationFloor) {
    		var passenger = new Passenger(this.nextPassengerNum++, startFloor, destinationFloor);
			this.passengers.push(passenger);
			//temp? may move this into passenger (or is it part of the state update)
			startFloor.passengersOnFloor[passenger.passengerNum] = passenger;
    	}
		
		Logger.log("Simulation", "Added passenger with start level " + startLevel
			+ " and destination level " + destinationLevel);
    };
    
    Simulation.prototype.getFloorForLevel = function(level) {
    	var floorIndex = level - 1;
    	if (floorIndex >= 0 && floorIndex < this.floors.length) {
    		return this.floors[floorIndex];
    	} else {
    		return null;
    	}
    };
    
    function makeElevators(numElevators) {
    	this.elevators = this.elevators || [];
    	this.elevators.length = 0;
    	
    	for (var i=0; i < numElevators; i++) {
    		this.elevators.push(new Elevator(i));
    	}
    }
    
    function makeFloors(numFloors) {
    	this.floors = this.floors || [];
    	this.floors.length = 0;
    	
    	for (var i=0; i < numFloors; i++) {
    		this.floors.push(new Floor(i));
    	}
    }
    
    function resetPassengers() {
		this.passengers = this.passengers || [];
    	this.passengers.length = 0;
    	this.nextPassengerNum = 0;
    }
    
    function initFloorElevatorSlots() {
    	var numElevators = this.elevators.length;
    	for (var i=0; i < this.floors.length; i++) {
    		this.floors[i].initElevatorSlots(numElevators);
    	}
    }
    
    // floor must not be null
    function initElevatorCurrentFloor(floor) {
    	for (var i=0; i < this.elevators.length; i++) {
    		setElevatorOnFloor.call(this, this.elevators[i], floor);
    	}
    }
    
    // elevator and floor must not be null
    function setElevatorOnFloor(elevator, floor) {
    	// First remove elevator from old floor
    	if (elevator.currentFloor) {
    		elevator.currentFloor.setElevatorSlot(elevator.elevatorNum, null);
    	}
    	
    	// Then update elevator's current floor and add elevator to new floor
		elevator.currentFloor = floor;
		floor.setElevatorSlot(elevator.elevatorNum, elevator)
    }
    
    function initElevatorPickupDropoffStops() {
    	var numFloors = this.floors.length;
    	for (var i=0; i < this.elevators.length; i++) {
    		this.elevators[i].initPickupDropoffStops(numFloors);
    	}
    }
    
	return Simulation;
}]).

factory('Elevator', ['Logger', function(Logger) {
	
	var Elevator = function(elevatorNum) {
		this.elevatorNum = elevatorNum;
		this.elevatorState = null; //todo enum
		this.doorMutex = null; //todo class
		this.currentFloor = null;
		this.direction = null; //todo enum
		this.pickupStops = [];
		this.dropoffStops = [];
		this.passengersOnElevator = {};
    };
    
    Elevator.prototype.initPickupDropoffStops = function(numFloors) {
    	this.pickupStops.length = 0;
    	this.dropoffStops.length = 0;
    	for (var i=0; i < numFloors; i++) {
    		this.pickupStops.push(false);
    		this.dropoffStops.push(false);
    	}
    };
    
	return Elevator;
}]).

factory('Floor', ['Logger', function(Logger) {
	
	var Floor = function(floorNum) {
		this.floorNum = floorNum; // floorNum is zero index, number 0 will be level 1
		this.upPressed = false;
		this.downPressed = false;
		this.passengersOnFloor = {};
		this.elevatorSlots = []; // Holds reference to elevator if it's on the floor, null otherwise
    };
    
    Floor.prototype.getLevel = function() {
    	return this.floorNum + 1;
    };
    
    Floor.prototype.initElevatorSlots = function(numElevators) {
    	this.elevatorSlots.length = 0;
    	for (var i=0; i < numElevators; i++) {
    		this.elevatorSlots.push(null);
    	}
    };
    
    Floor.prototype.setElevatorSlot = function(slotNumber, elevator) {
    	console.log("setElevatorSlot", this.floorNum, slotNumber, elevator);
    	if (slotNumber >= 0 && slotNumber < this.elevatorSlots.length) {
    		this.elevatorSlots[slotNumber] = elevator;
    	}
    };
    
    // Probably temporary
    Floor.prototype.elevatorSlotsToString = function() {
    	var result = "[";
    	for (var i=0; i < this.elevatorSlots.length; i++) {
    		result += (this.elevatorSlots[i] ? this.elevatorSlots[i].elevatorNum : "-") + " ";
    	}
    	result += "]";
    	return result;
    };
    
    // Probably temporary
    Floor.prototype.passengersOnFloorToString = function() {
    	var result = "[";
    	for (var passengerNum in this.passengersOnFloor) {
    		result += passengerNum + " ";
    	}
    	result += "]";
    	return result;
    };
    
	return Floor;
}]).

factory('Passenger', ['Logger', function(Logger) {
	
	var Passenger = function(passengerNum, startFloor, destinationFloor) {
		this.passengerNum = passengerNum;
		this.startFloor = startFloor;
		this.destinationFloor = destinationFloor;
		this.passengerState = null; //todo enum
		this.startTime = new Date().getTime();
		this.endTime = null;
		this.currentFloor = startFloor;
		this.currentElevator = null;
    };
    
	return Passenger;
}]).

factory('Incrementer', ['$timeout', 'Logger', function($timeout, Logger) {
	
	var Incrementer = function(interval) {
		this.interval = interval;
		this.incrementing = 0;
		
		if (this.incrementing < 100) {
			var self = this;
			$timeout(function() {
				self.updateIncrementing();
			}, this.interval);
		}
    };
    
    Incrementer.prototype.getStuff = function() {
    	return this.testParam + " " + this.testLocal;
    };
    
    Incrementer.prototype.updateIncrementing = function() {
    	this.incrementing++;
    	Logger.addLog("" + this.interval, "Incremented to " + this.incrementing);
    	
		var self = this;
		$timeout(function() {
			self.updateIncrementing();
		}, this.interval);
    };
    
	return Incrementer;
}]);