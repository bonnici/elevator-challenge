# Elevator Challenge

This is my entry into the first battle on /r/webdevbattles, which is to simulate 
the functionality of an elevator. I decided to go for a simulation that focuses
on the efficiency of a group of elevators. The elevators and passengers work as
autonomous agents, and the website user can add new passengers to the simulation
and see how long it takes them to get to their destination. Ideally the 
application would allow users to customize the elevator request selection logic
in an attempt to optimize the travel time of passengers, but I won't go that far
right now.

The application is entirely client-side and is built using AngularJS, and the
UI uses Bootstrap but is fairly simple, so there is no complicated CSS or 
responsive design.

The elevator behavior is quite buggy at the moment, and they can get stuck going 
between two floors. To fix it I think I need to change the pickup/dropoff set to 
a queue and move to floors at the front of the queue, stopping at other floors 
if needed. I'm not sure if I'll ever get around to doing that though.