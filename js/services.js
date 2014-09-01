'use strict';

angular.module('elevatorSim.services', []).

service('Logger', ["$log", function($log) {
	this.logs = [];
	
	this.log = function(type, objectId, message) {
		$log.info(type + "|" + objectId + ": " + message);
		this.logs.push({ 
			timestamp: new Date().getTime(), 
			type: type,
			objectId: objectId,
			message: message 
		});
	};
	
	this.clearLogs = function() {
		this.logs.length = 0;
	};
}]).

factory('Simulation', ['Logger', 'Elevator', 'Floor', 'Passenger', 'Enums', 
	function(Logger, Elevator, Floor, Passenger, Enums) {
	
	var Simulation = function(settings) {
		this.init(settings);
    };
    
    Simulation.prototype.init = function(settings) {
    	if (!settings || !settings.numElevators || !settings.numFloors || !settings.maxOccupancy) {
    		return;
    	}
    	
    	this.stop();
		
		makeElevators.call(this, settings.numElevators, settings.maxOccupancy);
		makeFloors.call(this, settings.numFloors);
		resetPassengers.call(this);
		
		initFloorElevatorSlots.call(this);
		initElevatorPickupDropoffStops.call(this);
		
		var groundFloor = this.getFloorForLevel(1);
		if (groundFloor) {
			initElevatorCurrentFloor.call(this, groundFloor);
		}
		
		Logger.clearLogs();
		Logger.log("Simulation", "0", "Initialized simulation with " + settings.numElevators 
			+ " elevators (" + settings.maxOccupancy + " max occupancy) and " + settings.numFloors + " floors.");
    };
    
    Simulation.prototype.stop = function() {
		stopElevators.call(this);
		stopPassengers.call(this);
		
		Logger.log("Simulation", "0", "Stopped simulation.");
    };
    
    Simulation.prototype.addPassenger = function(startLevel, destinationLevel) {
    	var startFloor = this.getFloorForLevel(startLevel);
    	var destinationFloor = this.getFloorForLevel(destinationLevel);
    	
    	if (startFloor && destinationFloor) {
    		var passenger = new Passenger(this.nextPassengerNum++, startFloor, destinationFloor);
			this.passengers.push(passenger);
			startFloor.passengersOnFloor[passenger.passengerNum] = passenger;
		
			Logger.log("Simulation", "0", "Added passenger with start level " + startLevel
				+ " and destination level " + destinationLevel);
    	}
    };
    
    Simulation.prototype.getFloorForLevel = function(level) {
    	var floorIndex = level - 1;
    	if (floorIndex >= 0 && floorIndex < this.floors.length) {
    		return this.floors[floorIndex];
    	} else {
    		return null;
    	}
    };
    
    // temporary? could keep for a "manual mode" - option to disable selector or all elevator movements
    Simulation.prototype.openElevator = function(elevatorNum) {
    	if (elevatorNum >= 0 && elevatorNum < this.elevators.length) {
    		this.elevators[elevatorNum].elevatorState = Enums.ElevatorState.Open;
    	}
    };
    Simulation.prototype.closeElevator = function(elevatorNum) {
    	if (elevatorNum >= 0 && elevatorNum < this.elevators.length) {
    		this.elevators[elevatorNum].elevatorState = Enums.ElevatorState.Closed;
    	}
    };
    Simulation.prototype.setElevatorDirection = function(elevatorNum, up) {
    	if (elevatorNum >= 0 && elevatorNum < this.elevators.length) {
    		if (up === null) {
    			this.elevators[elevatorNum].direction = Enums.ElevatorDirection.Stationary;
    		}
	    	else if (up) {
    			this.elevators[elevatorNum].direction = Enums.ElevatorDirection.Up;
	    	}
	    	else {
    			this.elevators[elevatorNum].direction = Enums.ElevatorDirection.Down;
	    	}
    	}
    };
    Simulation.prototype.moveElevator = function(elevatorNum, level) {
    	if (elevatorNum >= 0 && elevatorNum < this.elevators.length) {
    		setElevatorOnFloor.call(this, this.elevators[elevatorNum], this.getFloorForLevel(level));
    	}
    };
    Simulation.prototype.addPickupStopToElevator = function(elevatorNum, level, goingUp) {
    	if (elevatorNum >= 0 && elevatorNum < this.elevators.length) {
    		this.elevators[elevatorNum].addPickupStop(this.getFloorForLevel(level), goingUp);
    	}
    };
    Simulation.prototype.addDropoffStopToElevator = function(elevatorNum, level) {
    	if (elevatorNum >= 0 && elevatorNum < this.elevators.length) {
    		this.elevators[elevatorNum].addDropoffStopIfNeeded(this.getFloorForLevel(level));
    	}
    };
    
    function stopElevators() {
    	if (this.elevators) {
	    	for (var i=0; i < this.elevators.length; i++) {
	    		this.elevators[i].clearStateTimer();
	    	}
    	}
    }
    
    function makeElevators(numElevators, maxOccupancy) {
    	this.elevators = this.elevators || [];
    	this.elevators.length = 0;
    	
    	for (var i=0; i < numElevators; i++) {
    		this.elevators.push(new Elevator(i, maxOccupancy));
    	}
    }
    
    function makeFloors(numFloors) {
    	this.floors = this.floors || [];
    	this.floors.length = 0;
    	
    	for (var i=0; i < numFloors; i++) {
    		this.floors.push(new Floor(i));
    	}
    	
    	// Set up floors above/below
    	for (var i=0; i < numFloors - 1; i++) {
    		this.floors[i].floorAbove = this.floors[i+1];
    	}
    	for (var i=1; i < numFloors; i++) {
    		this.floors[i].floorBelow = this.floors[i-1];
    	}
    }
    
    function stopPassengers() {
    	if (this.passengers) {
	    	for (var i=0; i < this.passengers.length; i++) {
	    		this.passengers[i].clearStateTimer();
	    	}
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
    
    function initElevatorPickupDropoffStops() {
    	var numFloors = this.floors.length;
    	for (var i=0; i < this.elevators.length; i++) {
    		this.elevators[i].initPickupDropoffStops(numFloors);
    	}
    }
    
    // elevator and floor must not be null
    // this might be moved to elevator state updater
    function setElevatorOnFloor(elevator, floor) {
    	// First remove elevator from old floor
    	if (elevator.currentFloor) {
    		elevator.currentFloor.setElevatorSlot(elevator.elevatorNum, null);
    	}
    	
    	// Then update elevator's current floor and add elevator to new floor
		elevator.currentFloor = floor;
		floor.setElevatorSlot(elevator.elevatorNum, elevator);
    }
    
	return Simulation;
}]).


factory('Enums', function(Logger) {
	return {
		ElevatorDirection: { 
			Stationary: "Stationary", 
			Up: "Up", 
			Down: "Down" 
		},
		ElevatorState: { 
			Open: "Open", 
			Closed: "Closed", 
			UpTowards: "Moving up towards floor", 
			DownTowards: "Moving down towards floor" 
		},
		PassengerState: { 
			JoiningSim: "Joining simulation", 
			WaitingForElevator: "Waiting for elevator", 
			EnteringElevator: "Entering elevator", 
			WaitingToEnterElevator: "Waiting to enter elevator", 
			WaitingForFloor: "Waiting for floor", 
			WaitingToExitElevator: "Waiting to exit elevator", 
			ExitingElevator: "Exiting elevator", 
			ReachedDestination: "Reached destination"
		}
	};
}).

// Mutex that represents the elevator's entrance to stop multiple people from getting on or off at the same time
factory('ElevatorMutex', ['Logger', function(Logger) {
	
	var ElevatorMutex = function() {
		this.claimed = false;
    };
    
    // Returns true if the mutex could be claimed, false if not
    ElevatorMutex.prototype.claim = function() {
    	if (this.claimed) {
    		return false;
    	} else {
    		this.claimed = true;
    		return true;
    	}
    };
    
    ElevatorMutex.prototype.release = function() {
    	this.claimed = false;
    };
    
	return ElevatorMutex;
}]).

factory('Elevator', ['$timeout', 'Logger', 'Enums', 'ElevatorMutex', 'ElevatorStateTransition', 
	function($timeout, Logger, Enums, ElevatorMutex, ElevatorStateTransition) {
	
	var Elevator = function(elevatorNum, maxOccupancy) {
		this.elevatorNum = elevatorNum;
		this.maxOccupancy = maxOccupancy;
		this.elevatorState = Enums.ElevatorState.Closed;
		this.doorMutex = new ElevatorMutex();
		this.currentFloor = null;
		this.direction = Enums.ElevatorDirection.Stationary;
		this.passengersOnElevator = {};
		this.lastSensorTrigger = null; // The last time someone walked through the door
		// Pickup stops are added by the elevator selector, dropoff stops are added by passengers
		this.pickupGoingUpStops = [];
		this.pickupGoingDownStops = [];
		this.dropoffStops = [];
		
		// Don't immediately update state so the simulation can do initialization
		var self = this;
		this.updateStateTimeout = $timeout(function() {
			updateState.call(self);
		}, 1000);
    };
    
    Elevator.prototype.clearStateTimer = function() {
    	if (this.updateStateTimeout) {
    		$timeout.cancel(this.updateStateTimeout);
    	}
    };
    
    Elevator.prototype.initPickupDropoffStops = function(numFloors) {
    	this.pickupGoingUpStops.length = 0;
    	this.pickupGoingDownStops.length = 0;
    	this.dropoffStops.length = 0;
    	for (var i=0; i < numFloors; i++) {
    		this.pickupGoingUpStops.push(false);
    		this.pickupGoingDownStops.push(false);
    		this.dropoffStops.push(false);
    	}
    };
    
    Elevator.prototype.isFull = function() {
    	var passengerCount = 0;
		for (var key in this.passengersOnElevator) {
			if (this.passengersOnElevator.hasOwnProperty(key)) {
				passengerCount++;
			}
		}
		
		return passengerCount >= this.maxOccupancy;
    };
    
    Elevator.prototype.addDropoffStopIfNeeded = function(floor) {
    	if (floor) {
    		if (this.dropoffStops[floor.floorNum]) {
    			return false;
    		}
    		else {
    			this.dropoffStops[floor.floorNum] = true;
    			return true;
    		}
    	}
    };
    
    Elevator.prototype.removeDropoffStop = function(floor) {
    	if (floor) {
			this.dropoffStops[floor.floorNum] = false;
    	}
    };
    
    Elevator.prototype.addPickupStop = function(floor, goingUp) {
    	if (floor) {
    		if (goingUp) {
				this.pickupGoingUpStops[floor.floorNum] = true;
    		}
    		else {
				this.pickupGoingDownStops[floor.floorNum] = true;
    		}
    	}
    };
    
    Elevator.prototype.removePickupStop = function(floor, goingUp) {
    	if (floor) {
    		if (goingUp) {
				this.pickupGoingUpStops[floor.floorNum] = false;
    		}
    		else {
				this.pickupGoingDownStops[floor.floorNum] = false;
    		}
    	}
    };
    
    Elevator.prototype.addPassengerOnElevator = function(passenger) {
    	if (passenger) {
    		this.passengersOnElevator[passenger.passengerNum] = passenger;
    		this.lastSensorTrigger = new Date().getTime();
    	}
    };
    
    Elevator.prototype.removePassengerOnElevator = function(passenger) {
    	if (passenger) {
    		delete this.passengersOnElevator[passenger.passengerNum];
    	}
    };
    
    Elevator.prototype.isOpenAtFloor = function(floor) {
		return this.elevatorState == Enums.ElevatorState.Open && this.currentFloor == floor;
    };
    
    // Check to see if the elevator should stop at the current floor, given that it going to keep travelling in its 
    // current direction. If this returns false, we can then check to see if the elevator should change directions.
    Elevator.prototype.hasPickupDropoffOnCurrentFloor = function() {
    	if (!this.currentFloor) {
    		return false;
    	}
    	
    	for (var i=0; i < this.dropoffStops.length; i++) {
    		if (this.dropoffStops[this.currentFloor.floorNum]) {
    			return true;
    		}
    	}
    	
    	this.setPickupDirectionIfStationary();
    	
    	var pickupStopsToCheck = [];
    	if (this.direction == Enums.ElevatorDirection.Up) {
    		pickupStopsToCheck = this.pickupGoingUpStops;
    	}
    	else if (this.direction == Enums.ElevatorDirection.Down) {
    		pickupStopsToCheck = this.pickupGoingDownStops;
    	}
    	for (var i=0; i < pickupStopsToCheck.length; i++) {
    		if (pickupStopsToCheck[this.currentFloor.floorNum]) {
    			return true;
    		}
    	}
    	return false;
    };
    
    Elevator.prototype.sensorTriggeredRecently = function() {
    	var cutoffTime = new Date().getTime() - 2000;
    	return this.lastSensorTrigger && this.lastSensorTrigger > cutoffTime;
    };
    
    // Just finished picking up & dropping off passengers on this floor so clear pickup and dropoff stops and reset up 
    // button state on floor.
    Elevator.prototype.closedOnCurrentFloor = function() {
    	if (!this.currentFloor) {
    		return;
    	}
    	
    	if (this.direction == Enums.ElevatorDirection.Up) {
    		this.currentFloor.upPressed = false;
    		this.removePickupStop(this.currentFloor, true);
    	}
    	else if (this.direction == Enums.ElevatorDirection.Down) {
    		this.currentFloor.downPressed = false;
    		this.removePickupStop(this.currentFloor, false);
    	}
    	this.removeDropoffStop(this.currentFloor);
    };
    
    // If the elevator is stationary and about to pick up passengers, make sure we have a direction set so the 
    // passengers know if they should enter. If pickups exist for both directions pick one at random to avoid any bias.
    Elevator.prototype.setPickupDirectionIfStationary = function() {
    	if (this.direction == Enums.ElevatorDirection.Stationary) {
    		var hasUpPickup = this.pickupGoingUpStops[this.currentFloor.floorNum];
    		var hasDownPickup = this.pickupGoingDownStops[this.currentFloor.floorNum];
    		
    		if (hasUpPickup && hasDownPickup) {
				this.direction = (Math.random() > 0.5 ? Enums.ElevatorDirection.Up : Enums.ElevatorDirection.Down);
    		}
    		else if (hasUpPickup) {
    			this.direction = Enums.ElevatorDirection.Up;
    		}
    		else if (hasDownPickup) {
    			this.direction = Enums.ElevatorDirection.Down;
    		}
    	}
    };
    
    // Move to the next floor up and update direction
    Elevator.prototype.changeFloorUp = function() {
    	this.direction = Enums.ElevatorDirection.Up;
    	
    	var nextFloorUp = this.currentFloor.floorAbove;
    	changeToFloor.call(this, nextFloorUp);
    };
    
    // Move to the next floor down and update direction
    Elevator.prototype.changeFloorDown = function() {
    	this.direction = Enums.ElevatorDirection.Down;
    	
    	var nextFloorDown = this.currentFloor.floorBelow;
    	changeToFloor.call(this, nextFloorDown);
    };
    
    Elevator.prototype.hasDropoffAbove = function() {
    	return findStopBetween(this.dropoffStops, this.currentFloor.floorNum + 1, this.dropoffStops.length - 1);
    };
    
    Elevator.prototype.hasDropoffBelow = function() {
    	return findStopBetween(this.dropoffStops, 0, this.currentFloor.floorNum - 1);
    };
    
    Elevator.prototype.hasUpPickupAbove = function() {
    	return findStopBetween(this.pickupGoingUpStops, this.currentFloor.floorNum + 1, this.dropoffStops.length - 1);
    };
    
    Elevator.prototype.hasDownPickupBelow = function() {
    	return findStopBetween(this.pickupGoingDownStops, 0, this.currentFloor.floorNum - 1);
    };
    
    // Find the direction of the pickup stop closest to the current floor, assuming there are no pickups on this floor
    Elevator.prototype.findClosestPickup = function() {
    	var numFloors = this.pickupGoingUpStops.length;
    	// Fan out from the current floor, randomly choosing whether to check up or down first at each layer
    	for (var floorsAwayFromCurrent = 1; floorsAwayFromCurrent < numFloors; floorsAwayFromCurrent++) {
    		var checkingFloorAboveFirst = Math.random() > 0.5;
    		if (checkingFloorAboveFirst) {
				if (this.hasAnyPickupAtFloor(this.currentFloor.floorNum + floorsAwayFromCurrent)) {
					return Enums.ElevatorDirection.Up;
				}
				if (this.hasAnyPickupAtFloor(this.currentFloor.floorNum - floorsAwayFromCurrent)) {
					return Enums.ElevatorDirection.Down;
				}
    		}
    		else {
				if (this.hasAnyPickupAtFloor(this.currentFloor.floorNum - floorsAwayFromCurrent)) {
					return Enums.ElevatorDirection.Down;
				}
				if (this.hasAnyPickupAtFloor(this.currentFloor.floorNum + floorsAwayFromCurrent)) {
					return Enums.ElevatorDirection.Up;
				}
    		}
    	}
    	
    	// No pickup floors found
    	return Enums.ElevatorDirection.Stationary;
    };
    
    Elevator.prototype.hasAnyPickupAtFloor = function(floorNum) {
    	if (floorNum < 0 || floorNum >= this.pickupGoingUpStops.length) {
    		return false;
    	}
    	return this.pickupGoingUpStops[floorNum] || this.pickupGoingDownStops[floorNum];
    };
    
    // Probably temporary
    Elevator.prototype.passengersOnElevatorToString = function() {
    	var result = "[";
    	for (var passengerNum in this.passengersOnElevator) {
    		result += passengerNum + " ";
    	}
    	result += "]";
    	return result;
    };
    
    function updateState() {
    	var timeInNewState = ElevatorStateTransition.transitionToNextState(this);
    	if (timeInNewState) {
			var self = this;
			this.updateStateTimeout = $timeout(function() {
				updateState.call(self);
			}, timeInNewState);
    	}
    }
    
    // Helper function to find a pickup or dropoff stop between two floors
    function findStopBetween(stops, start, endInclusive) {
    	for (var i = start; i <= endInclusive; i++) {
    		if (stops[i]) {
    			return true;
    		}
    	}
		return false;
    }
    
    function changeToFloor(toFloor) {
    	if (toFloor) {
    		this.currentFloor.setElevatorSlot(this.elevatorNum, null);
    		this.currentFloor = toFloor;
    		this.currentFloor.setElevatorSlot(this.elevatorNum, this);
    	}
    }
    
	return Elevator;
}]).

// This service handles the logic for the transition between states of an elevator. It returns the time that should be 
// spent in the new state, or null if no more state transitions should occur.
service('ElevatorStateTransition', ["Logger", "Enums", function(Logger, Enums) {
	// elevator must not be null
	this.transitionToNextState = function(elevator) {
		switch (elevator.elevatorState) {
			case Enums.ElevatorState.Open: 
				return transitionFromOpen(elevator);
				
			case Enums.ElevatorState.Closed:
				return transitionFromClosed(elevator);
				
			case Enums.ElevatorState.UpTowards:
				return transitionFromUpTowards(elevator);
				
			case Enums.ElevatorState.DownTowards:
				return transitionFromDownTowards(elevator);
		}
		
		log(elevator.elevatorNum, "Unexpected state");
		return null;
	};
    
    // If the last sensor trigger was recent, people may still be waiting to get on the elevator so stay open for a
    // while longer. Otherwise close the door.
    function transitionFromOpen(elevator) {
		if (elevator.sensorTriggeredRecently()) {
			log(elevator.elevatorNum, "Sensor was triggered recently, so stay open");
			elevator.elevatorState = Enums.ElevatorState.Open;
			return 2000;
		}
		else {
			log(elevator.elevatorNum, "Sensor was not triggered recently, so close the door");
			elevator.closedOnCurrentFloor();
			elevator.elevatorState = Enums.ElevatorState.Closed;
			return 1000;
		}
    }
    
    // If the elevator is on a floor that has people to pick up or drop off, open the door. Otherwise stay closed.
    function transitionFromClosed(elevator) {
    	
    	// First check for pickup on this floor, setting our direction before opening the door if we are stationary
    	
		if (elevator.hasPickupDropoffOnCurrentFloor()) {
			log(elevator.elevatorNum, "Need to pick up or drop off on this floor, so open the door");
			elevator.elevatorState = Enums.ElevatorState.Open;
			return 4000;
		}
		
		// Next check for dropoffs or pickups going in the same direction we are going
		
		// If we have a dropoff or an up pickup above and are heading up, go up
		if (elevator.direction == Enums.ElevatorDirection.Up && (elevator.hasDropoffAbove() || elevator.hasUpPickupAbove())) {
			log(elevator.elevatorNum, "Going up with stops above, heading up");
			elevator.changeFloorUp();
			elevator.elevatorState = Enums.ElevatorState.UpTowards;
			return 4000;
		}
		
		// If we have a dropoff or a down pickup below and are heading down, go down
		if (elevator.direction == Enums.ElevatorDirection.Down && (elevator.hasDropoffBelow() || elevator.hasDownPickupBelow())) {
			log(elevator.elevatorNum, "Going down with stops below, heading down");
			elevator.changeFloorDown();
			elevator.elevatorState = Enums.ElevatorState.DownTowards;
			return 4000;
		}
		
		// Next prioritize dropoffs, changing direction if we need to
		
		// If we have dropoff above, head up
		if (elevator.hasDropoffAbove()) {
			log(elevator.elevatorNum, "No stops on the way but dropoff above, heading up");
			elevator.changeFloorUp();
			elevator.elevatorState = Enums.ElevatorState.UpTowards;
			return 4000;
		}
		
		// If we have dropoff below, head down
		if (elevator.hasDropoffBelow()) {
			log(elevator.elevatorNum, "No stops on the way but dropoff below, heading down");
			elevator.changeFloorDown();
			elevator.elevatorState = Enums.ElevatorState.DownTowards;
			return 4000;
		}
		
		// Now we know we have no pickups/dropoffs in the direction we're on right now, and no pending dropoffs, so
		// look for the closest pickup stop and head in that direction
		var direction = elevator.findClosestPickup();
		if (direction == Enums.ElevatorDirection.Up) {
			log(elevator.elevatorNum, "No dropoffs left but closest pickup is above, heading up");
			elevator.changeFloorUp();
			elevator.elevatorState = Enums.ElevatorState.UpTowards;
			return 4000;
		}
		else if (direction == Enums.ElevatorDirection.Down) {
			log(elevator.elevatorNum, "No dropoffs left but closest pickup is below, heading down");
			elevator.changeFloorDown();
			elevator.elevatorState = Enums.ElevatorState.DownTowards;
			return 4000;
		}
		
		// Otherwise we have no pickups or dropoffs, stay closed and set direction to stationary
		//log(elevator.elevatorNum, "No-one to pick up or drop off, stay closed");
		elevator.direction = Enums.ElevatorDirection.Stationary;
		elevator.elevatorState = Enums.ElevatorState.Closed;
		return 1000;
    }
    
    function transitionFromUpTowards(elevator) {
    	// Just set state as Closed and let that transition do its thing, not really needed but adds a nice graphical touch
		elevator.elevatorState = Enums.ElevatorState.Closed;
		return 1000;
    }
    
    function transitionFromDownTowards(elevator) {
    	// Just set state as Closed and let that transition do its thing, not really needed but adds a nice graphical touch
		elevator.elevatorState = Enums.ElevatorState.Closed;
		return 1000;
    }
    
    function log(elevatorNum, message) {
		Logger.log("ElevatorStateTransition", elevatorNum, message);
    }
}]).

factory('Floor', ['Logger', 'Enums', function(Logger, Enums) {
	
	var Floor = function(floorNum) {
		this.floorNum = floorNum; // floorNum is zero index, number 0 will be level 1
		this.upPressed = false;
		this.downPressed = false;
		this.passengersOnFloor = {};
		this.elevatorSlots = []; // Holds reference to elevator if it's on the floor, null otherwise
		this.floorAbove = null; // Assumed to be initialized after construction
		this.floorBelow = null; // Assumed to be initialized after construction
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
    	if (slotNumber >= 0 && slotNumber < this.elevatorSlots.length) {
    		this.elevatorSlots[slotNumber] = elevator;
    	}
    };
    
    Floor.prototype.callElevatorIfNeeded = function(direction) {
    	if (direction == Enums.ElevatorDirection.Up) {
    		if (this.upPressed) {
    			return false;
    		} 
    		else {
    			this.upPressed = true;
    			return true;
    		}
    	}
    	else if (direction == Enums.ElevatorDirection.Down) {
    		if (this.downPressed) {
    			return false;
    		} 
    		else {
    			this.downPressed = true;
    			return true;
    		}
    	}
    	return false;
    };
    
    Floor.prototype.getOpenElevators = function(direction) {
    	var elevators = [];
    	for (var i=0; i < this.elevatorSlots.length; i++) {
    		var elevatorInSlot = this.elevatorSlots[i];
    		if (elevatorInSlot && elevatorInSlot.elevatorState == Enums.ElevatorState.Open 
    			&& elevatorInSlot.direction == direction) {
    			elevators.push(elevatorInSlot);
    		}
    	}
    	return elevators;
    };
    
    Floor.prototype.removePassengerOnFloor = function(passenger) {
    	if (passenger) {
    		delete this.passengersOnFloor[passenger.passengerNum];
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

factory('Passenger', ['$timeout', 'Logger', 'Enums', 'PassengerStateTransition', 
	function($timeout, Logger, Enums, PassengerStateTransition) {
	
	var Passenger = function(passengerNum, startFloor, destinationFloor) {
		this.passengerNum = passengerNum;
		this.startFloor = startFloor;
		this.destinationFloor = destinationFloor;
		this.passengerState = Enums.PassengerState.JoiningSim;
		this.startTime = new Date().getTime();
		this.endTime = null;
		this.currentFloor = startFloor;
		this.currentElevator = null;
		
		// Don't immediately update state so the simulation can do initialization
		var self = this;
		this.updateStateTimeout = $timeout(function() {
			updateState.call(self);
		}, 1000);
    };
    
    Passenger.prototype.clearStateTimer = function() {
    	if (this.updateStateTimeout) {
    		$timeout.cancel(this.updateStateTimeout);
    	}
    };
    
    Passenger.prototype.setEndTime = function() {
		this.endTime = new Date().getTime();
    };
    
    // Returns true if there is an elevator open on the floor going in the right direction
    Passenger.prototype.isElevatorOpenOnFloor = function() {
    	if (!this.currentFloor) {
    		return false;
    	}
    	
    	var direction = this.getDirection();
    	return this.currentFloor.getOpenElevators(direction).length > 0;
    };
    
    // Try to enter all open elevators on floor, return true if a door mutex was claimed
    Passenger.prototype.tryToEnterElevator = function() {
    	if (!this.currentFloor) {
    		return false;
    	}
    	
    	var direction = this.getDirection();
    	var elevators = this.currentFloor.getOpenElevators(direction);
    	
    	for (var i=0; i < elevators.length; i++) {
    		if (!elevators[i].isFull() && elevators[i].doorMutex.claim()) {
    			enterElevator.call(this, elevators[i]);
    			return true;
    		}
    	}
    	return false;
    };
    
    Passenger.prototype.releaseDoorMutex = function() {
    	if (this.currentElevator) {
     		this.currentElevator.doorMutex.release();
    	}
    };
    
    // Press the button to call for an elevator if it hasn't already been pressed. Returns true if the button was 
    // pressed.
    Passenger.prototype.callElevator = function() {
    	if (!this.currentFloor) {
    		return false;
    	}
		
		//todo need to call the elevator selector somewhere
		
    	var direction = this.getDirection();
	    return this.currentFloor.callElevatorIfNeeded(direction);
    };
    
    Passenger.prototype.getDirection = function() {
    	if (this.currentFloor === null || this.destinationFloor === null || this.currentFloor == this.destinationFloor) {
    		return Enums.ElevatorDirection.Stationary;
    	}
    	else if (this.currentFloor.getLevel() < this.destinationFloor.getLevel()) {
    		return Enums.ElevatorDirection.Up;
    	}
    	else {
    		return Enums.ElevatorDirection.Down;
    	}
    };
    
    Passenger.prototype.isStoppedAtDestination = function() {
    	if (!this.currentElevator) {
    		return false;
    	}
    	
    	return this.currentElevator.isOpenAtFloor(this.destinationFloor);
    };
    
    Passenger.prototype.tryToLeaveElevator = function() {
    	if (!this.currentElevator) {
    		return false;
    	}
    	
    	return this.currentElevator.doorMutex.claim();
    };
    
    // Returns true if the floor was picked, false if it was already picked
    Passenger.prototype.pickFloorInElevator = function() {
    	if (!this.currentElevator) {
    		return false;
    	}
    	
	    return this.currentElevator.addDropoffStopIfNeeded(this.destinationFloor);
    };
    
    Passenger.prototype.setDone = function() {
    	this.endTime = new Date().getTime();
    	
    	// Make sure floor and elevator are cleared
    	if (this.currentFloor) {
    		this.currentFloor.removePassengerOnFloor(this);
    		this.currentFloor = null;
    	}
    	
    	if (this.currentElevator) {
    		this.currentElevator.removePassengerOnElevator(this);
    		this.currentElevator = null;
    	}
    };
    
    Passenger.prototype.setAsExited = function() {
    	if (!this.currentElevator) {
    		return false;
    	}
    	
    	this.currentElevator.doorMutex.release();
    	this.currentElevator.removePassengerOnElevator(this);
    	this.currentElevator = null;
    };
    
    function updateState() {
    	var timeInNewState = PassengerStateTransition.transitionToNextState(this);
    	if (timeInNewState) {
			var self = this;
			this.updateStateTimeout = $timeout(function() {
				updateState.call(self);
			}, timeInNewState);
    	}
    }
    
    // Enter elevator, update elevator and floor with new passenger details, and add a stop to the elevator
    function enterElevator(elevator) {
		this.currentElevator = elevator;
		this.currentElevator.addPassengerOnElevator(this);
		
		this.currentFloor.removePassengerOnFloor(this);
		this.currentFloor = null;
    }
    
    function log(message) {
		Logger.log("Passenger", this.passengerNum, message);
    }
    
	return Passenger;
}]).

// This service handles the logic for the transition between states of a passenger. It returns the time that should be 
// spent in the new state, or null if no more state transitions should occur.
service('PassengerStateTransition', ["Logger", "Enums", function(Logger, Enums) {
	// passenger must not be null
	this.transitionToNextState = function(passenger) {
		switch (passenger.passengerState) {
			case Enums.PassengerState.JoiningSim: 
				return transitionFromJoiningSim(passenger);
				
			case Enums.PassengerState.WaitingForElevator:
				return transitionFromWaitingForElevator(passenger);
				
			case Enums.PassengerState.EnteringElevator:
				return transitionFromEnteringElevator(passenger);
				
			case Enums.PassengerState.WaitingToEnterElevator:
				return transitionFromWaitingToEnterElevator(passenger);
				
			case Enums.PassengerState.WaitingForFloor:
				return transitionFromWaitingForFloor(passenger);
				
			case Enums.PassengerState.WaitingToExitElevator:
				return transitionFromWaitingToExitElevator(passenger);
				
			case Enums.PassengerState.ExitingElevator:
				return transitionFromExitingElevator(passenger);
				
			case Enums.PassengerState.ReachedDestination:
				return transitionFromReachedDestination(passenger);
		}
		
		log(passenger.passengerNum, "Unexpected state");
		return null;
	};
    
    // Passenger has just been added to the simulation, enter an elevator or call for one.
    function transitionFromJoiningSim(passenger) {
    	// If for some reason they are on their destination floor, transition to ReachedDestination state
    	if (passenger.currentFloor == passenger.destinationFloor) {
    		log(passenger.passengerNum, "Passenger was already on their destination floor");
    		passenger.passengerState = Enums.PassengerState.ReachedDestination;
    		return 100;
    	}
    	
    	// Otherwise just set the passenger as waiting for an elevator
		log(passenger.passengerNum, "Started waiting for an elevator");
		passenger.passengerState = Enums.PassengerState.WaitingForElevator;
		return 100;
    }
    
    // Passenger is waiting for an elevator, open any available elevators going in the right direction or call for an 
    // elevator if needed
    function transitionFromWaitingForElevator(passenger) {
    	if (!passenger.currentFloor) {
			log(passenger.passengerNum, "Invalid state, passengers waiting for an elevator should be on a floor");
			return null;
    	}
    	
	    // If an elevator is open and going in the direction they want to go, try to get on it.
	    if (passenger.isElevatorOpenOnFloor()) {
	    	if (passenger.tryToEnterElevator()) {
    			log(passenger.passengerNum, "Found an open elevator and started entering it");
				passenger.passengerState = Enums.PassengerState.EnteringElevator;
				return 500;
	    	} 
	    	else {
    			log(passenger.passengerNum, "Found an open elevator but could not enter it yet");
				passenger.passengerState = Enums.PassengerState.WaitingToEnterElevator;
				
				var randomDelay = Math.floor(Math.random() * 100);
				return 500 + randomDelay;
	    	}
	    }
	    else {
	    	var called = passenger.callElevator();
	    	if (called) {
				log(passenger.passengerNum, "Called for an elevator");
	    	}
	    	else {
				//log(passenger.passengerNum, "Waiting for an elevator");
	    	}
	    	
			passenger.passengerState = Enums.PassengerState.WaitingForElevator;
	    	return 1000; //todo customizable state transition times
	    }
    }
	
	// Passenger has just entered an elevator, release the door mutex
    function transitionFromEnteringElevator(passenger) {
    	if (!passenger.currentElevator) {
			log(passenger.passengerNum, "Invalid state, passengers entering an elevator should be on an elevator");
			return null;
    	}
    	
		log(passenger.passengerNum, "Finished entering elevator");
		passenger.releaseDoorMutex();
		passenger.passengerState = Enums.PassengerState.WaitingForFloor;
		return 100;
    }
	
	// Passenger could not claim an elevator index but will try again as long as there is still an open elevator on the 
	// floor
    function transitionFromWaitingToEnterElevator(passenger) {
    	if (!passenger.currentFloor) {
			log(passenger.passengerNum, "Invalid state, passengers waiting to enter an elevator should be on a floor");
			return null;
    	}
    	
    	// If there is no longer an open elevator, go back to waiting for elevator
	    if (!passenger.isElevatorOpenOnFloor()) { 
			log(passenger.passengerNum, "Elevators closed before passenger could get on! Waiting again.");
			passenger.passengerState = Enums.PassengerState.WaitingForElevator;
			return 100;
	    }
	    
    	if (passenger.tryToEnterElevator()) {
			log(passenger.passengerNum, "Found an open elevator and started entering it");
			passenger.passengerState = Enums.PassengerState.EnteringElevator;
			return 500;
    	} 
    	else {
			log(passenger.passengerNum, "Found an open elevator but could not enter it yet");
			passenger.passengerState = Enums.PassengerState.WaitingToEnterElevator;
				
			var randomDelay = Math.floor(Math.random() * 100);
			return 500 + randomDelay;
    	}
    }
    
    // Passenger is on the elevator waiting for it to reach their floor, when it does, try to exit the elevator. If the 
    // passenger's target floor is not a dropoff, add it.
    function transitionFromWaitingForFloor(passenger) {
    	if (!passenger.currentElevator) {
			log(passenger.passengerNum, "Invalid state, passengers waiting for a floor should be on an elevator");
			return null;
    	}
    	
    	if (passenger.isStoppedAtDestination()) {
	    	if (passenger.tryToLeaveElevator()) {
    			log(passenger.passengerNum, "On destination floor and started exiting elevator");
				passenger.passengerState = Enums.PassengerState.ExitingElevator;
				return 500;
	    	} 
	    	else {
    			log(passenger.passengerNum, "On destination floor but could not exit elevator");
				passenger.passengerState = Enums.PassengerState.WaitingToExitElevator;
				
				var randomDelay = Math.floor(Math.random() * 100);
				return 500 + randomDelay;
	    	}
    	}
    	// Otherwise press the destination floor button if needed
    	else {
	    	var called = passenger.pickFloorInElevator();
	    	if (called) {
				log(passenger.passengerNum, "Added destination floor as dropoff");
	    	}
	    	else {
				//log(passenger.passengerNum, "Waiting for elevator to get to destination");
	    	}
	    	
			passenger.passengerState = Enums.PassengerState.WaitingForFloor;
	    	return 1000;
    	}
    }
    
    // Passenger tried to exit but the door was taken, wait a bit and try again
    function transitionFromWaitingToExitElevator(passenger) {
    	if (!passenger.currentElevator) {
			log(passenger.passengerNum, "Invalid state, passengers waiting to exit an elevator should be on an elevator");
			return null;
    	}
    	
    	// If the elevator is no longer open, go back to waiting for floor
	    if (!passenger.isStoppedAtDestination()) { 
			log(passenger.passengerNum, "Elevators closed before passenger could get off! Waiting for floor again.");
			passenger.passengerState = Enums.PassengerState.WaitingForFloor;
			return 100;
	    }
	    
    	if (passenger.tryToLeaveElevator()) {
			log(passenger.passengerNum, "Got access to elevator door and started exiting");
			passenger.passengerState = Enums.PassengerState.ExitingElevator;
			return 500;
    	} 
    	else {
			log(passenger.passengerNum, "On destination floor but could not exit elevator");
			passenger.passengerState = Enums.PassengerState.WaitingToExitElevator;
				
			var randomDelay = Math.floor(Math.random() * 100);
			return 500 + randomDelay;
    	}
    }
    
    // Passenger claimed to elevator door mutex and is exiting the elevator
    function transitionFromExitingElevator(passenger) {
    	if (!passenger.currentElevator) {
			log(passenger.passengerNum, "Invalid state, passengers exiting an elevator should be on an elevator");
			return null;
    	}
    	
		log(passenger.passengerNum, "Exited the elevator");
    	passenger.setAsExited();
		passenger.passengerState = Enums.PassengerState.ReachedDestination;
		return 100;
    }
    
    // Passenger reached their target floor, all done!
    function transitionFromReachedDestination(passenger) {
		log(passenger.passengerNum, "Passenger has reached their destination!");
    	passenger.setDone();
    	return null;
    }
    
    function log(passengerNum, message) {
		Logger.log("PassengerStateTransition", passengerNum, message);
    }
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